// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ETendering
 * @notice Blockchain-Enabled E-Tendering System for PhD Research.
 * @dev Enforces trust and strict state machine progression across all 7 stages:
 *      Advertised -> PrequalificationOpen -> Submitted -> Opened -> Evaluated -> Awarded -> Archived
 *      Includes Institutional Role-Based Access Control (RBAC) to ensure only accredited officers can create tenders.
 */
contract ETendering {
    // --- State Machine Enum ---
    enum Stage {
        Advertised,          // Stage 1: Tender created and advertised
        PrequalificationOpen,// Stage 2: Bidders register and officer approves prequalification
        Submitted,           // Stage 3: Prequalified bidders submit hashed proposals before deadline
        Opened,              // Stage 4: Officer opens tender after deadline has passed
        Evaluated,           // Stage 5: Officer enters technical & financial scores (write-once)
        Awarded,             // Stage 6: Highest scoring evaluated bidder is determined on-chain
        Archived             // Stage 7: Final contract record locked permanently with document hash
    }

    // --- Struct Definitions ---
    struct Criterion {
        string name;
        string minimumRequirement; // (string, empty if upload-only)
        bool requiresUpload;
    }

    struct Tender {
        uint256 id;
        string title;
        string description;
        uint256 deadline;
        Stage state;
        uint256 weightTechnical;
        uint256 weightFinancial;
        address officer;
        address winner;
        uint256 winningScore;
        bytes32 finalDocHash;
        uint256 openedTimestamp;
        uint256 archivedTimestamp;
        bool prequalificationSkipped;
        bytes32 specDocHash;
        uint256 tenderFee;
    }

    struct Bidder {
        address bidderAddress;
        bool registered;
        bool prequalified;
        bool hasSubmitted;
        bool withdrawn;
        bytes32 docHash;
        uint256 submissionTimestamp;
        uint256 technicalScore;
        uint256 financialScore;
        uint256 totalScore;
        bool evaluated;
    }

    // --- Governance & RBAC State Variables ---
    address public admin;
    mapping(address => bool) public isAuthorizedOfficer;
    mapping(address => string) public officerAgency;

    // --- Tender State Variables ---
    uint256 public tenderCount;
    mapping(uint256 => Tender) public tenders;
    mapping(uint256 => mapping(address => Bidder)) public bidders;
    mapping(uint256 => mapping(address => bool)) public hasPurchasedTender;
    mapping(uint256 => uint256) public tenderBalances;
    mapping(uint256 => address[]) private _registeredBidders;
    mapping(uint256 => Criterion[]) private _tenderCriteria;

    // --- Governance Events ---
    event OfficerAuthorized(address indexed officer, string agency);
    event OfficerRevoked(address indexed officer);

    // --- Events (All Lifecycle State Transitions & Audit Trails) ---
    event TenderAdvertised(
        uint256 indexed tenderId,
        string title,
        string description,
        uint256 deadline,
        uint256 weightTechnical,
        uint256 weightFinancial,
        bytes32 specDocHash,
        uint256 tenderFee,
        address officer
    );
    event TenderDocumentPurchased(
        uint256 indexed tenderId,
        address indexed bidder,
        uint256 feePaid
    );
    event TenderFeesWithdrawn(
        uint256 indexed tenderId,
        address indexed officer,
        uint256 amount
    );
    event PrequalificationOpened(uint256 indexed tenderId);
    event PrequalificationInitiated(uint256 indexed tenderId, uint256 criteriaCount);
    event PrequalificationSkipped(uint256 indexed tenderId);
    event BidderRegistered(uint256 indexed tenderId, address indexed bidder);
    event BidderPrequalified(uint256 indexed tenderId, address indexed bidder);
    event SubmissionOpened(uint256 indexed tenderId);
    event BidSubmitted(
        uint256 indexed tenderId,
        address indexed bidder,
        bytes32 docHash,
        uint256 timestamp
    );
    event BidWithdrawn(
        uint256 indexed tenderId,
        address indexed bidder,
        uint256 timestamp
    );
    event BidSubstituted(
        uint256 indexed tenderId,
        address indexed bidder,
        bytes32 oldDocHash,
        bytes32 newDocHash
    );
    event TenderOpened(uint256 indexed tenderId, uint256 timestamp);
    event BidEvaluated(
        uint256 indexed tenderId,
        address indexed bidder,
        uint256 technicalScore,
        uint256 financialScore,
        uint256 totalScore
    );
    event TenderAwarded(
        uint256 indexed tenderId,
        address indexed winner,
        uint256 winningScore
    );
    event EvaluationWeightsSet(
        uint256 indexed tenderId,
        uint256 weightTechnical,
        uint256 weightFinancial
    );
    event TenderArchived(
        uint256 indexed tenderId,
        bytes32 finalDocHash,
        uint256 timestamp
    );

    // --- Modifiers ---
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin/procurement authority allowed");
        _;
    }

    modifier onlyAccreditedOfficer() {
        require(isAuthorizedOfficer[msg.sender], "Caller is not an accredited procurement officer");
        _;
    }

    modifier tenderExists(uint256 _tenderId) {
        require(_tenderId > 0 && _tenderId <= tenderCount, "Tender does not exist");
        _;
    }

    modifier onlyOfficer(uint256 _tenderId) {
        require(_tenderId > 0 && _tenderId <= tenderCount, "Tender does not exist");
        require(msg.sender == tenders[_tenderId].officer, "Only tender creating officer allowed");
        require(isAuthorizedOfficer[msg.sender], "Caller is not an accredited procurement officer");
        _;
    }

    modifier notArchived(uint256 _tenderId) {
        require(tenders[_tenderId].state != Stage.Archived, "Tender is archived and read-only");
        _;
    }

    modifier inStage(uint256 _tenderId, Stage _expectedStage) {
        require(tenders[_tenderId].state == _expectedStage, "Invalid stage for this action");
        _;
    }

    constructor() {
        admin = msg.sender;
        isAuthorizedOfficer[msg.sender] = true;
        officerAgency[msg.sender] = "Ministry of Finance & Procurement Authority";
    }

    // --- RBAC Officer Accreditation ---
    /**
     * @notice Admin accredits a new government procurement officer wallet.
     * @param _officer Address of the officer's wallet.
     * @param _agency Name of the government agency or department.
     */
    function authorizeOfficer(address _officer, string memory _agency) external onlyAdmin {
        require(_officer != address(0), "Invalid officer address");
        require(bytes(_agency).length > 0, "Agency name required");
        isAuthorizedOfficer[_officer] = true;
        officerAgency[_officer] = _agency;
        emit OfficerAuthorized(_officer, _agency);
    }

    /**
     * @notice Admin revokes accreditation of a procurement officer.
     * @param _officer Address of the officer to revoke.
     */
    function revokeOfficer(address _officer) external onlyAdmin {
        require(_officer != admin, "Cannot revoke contract admin");
        require(isAuthorizedOfficer[_officer], "Address is not an authorized officer");
        isAuthorizedOfficer[_officer] = false;
        emit OfficerRevoked(_officer);
    }

    /**
     * @notice Creates and advertises a new tender with official specifications document and optional purchase fee.
     * @param _title Title of the tender.
     * @param _description Detailed description / scope of the tender.
     * @param _deadline Unix timestamp marking tender closing deadline.
     * @param _weightTechnical Weight for technical evaluation (e.g. 70).
     * @param _weightFinancial Weight for financial evaluation (e.g. 30).
     * @param _specDocHash Cryptographic hash (Keccak-256) of officer's tender specifications dossier.
     * @param _tenderFee Required fee (in wei) to purchase the tender dossier (0 if free).
     */
    function createTender(
        string memory _title,
        string memory _description,
        uint256 _deadline,
        uint256 _weightTechnical,
        uint256 _weightFinancial,
        bytes32 _specDocHash,
        uint256 _tenderFee
    ) external onlyAccreditedOfficer returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_deadline > block.timestamp, "Deadline must be in the future");
        require(_weightTechnical + _weightFinancial > 0, "Weights must be positive");

        tenderCount++;
        uint256 newId = tenderCount;

        tenders[newId] = Tender({
            id: newId,
            title: _title,
            description: _description,
            deadline: _deadline,
            state: Stage.Advertised,
            weightTechnical: _weightTechnical,
            weightFinancial: _weightFinancial,
            officer: msg.sender,
            winner: address(0),
            winningScore: 0,
            finalDocHash: bytes32(0),
            openedTimestamp: 0,
            archivedTimestamp: 0,
            prequalificationSkipped: false,
            specDocHash: _specDocHash,
            tenderFee: _tenderFee
        });

        emit TenderAdvertised(
            newId,
            _title,
            _description,
            _deadline,
            _weightTechnical,
            _weightFinancial,
            _specDocHash,
            _tenderFee,
            msg.sender
        );

        return newId;
    }

    // --- Stage 2: Prequalification ---
    /**
     * @notice Officer initiates prequalification by storing finalized criteria on-chain.
     * @param _tenderId Unique identifier of the tender.
     * @param _criteria Array of prequalification criteria structs.
     */
    function initiatePrequalification(uint256 _tenderId, Criterion[] calldata _criteria)
        external
        tenderExists(_tenderId)
        onlyOfficer(_tenderId)
        notArchived(_tenderId)
        inStage(_tenderId, Stage.Advertised)
    {
        require(_criteria.length > 0, "Criteria cannot be empty; use skipPrequalification instead");

        delete _tenderCriteria[_tenderId];
        for (uint256 i = 0; i < _criteria.length; i++) {
            require(bytes(_criteria[i].name).length > 0, "Criterion name cannot be empty");
            _tenderCriteria[_tenderId].push(_criteria[i]);
        }

        tenders[_tenderId].state = Stage.PrequalificationOpen;
        emit PrequalificationOpened(_tenderId);
        emit PrequalificationInitiated(_tenderId, _criteria.length);
    }

    /**
     * @notice Officer bypasses prequalification entirely, moving tender directly to submission-eligible state.
     * @param _tenderId Unique identifier of the tender.
     */
    function skipPrequalification(uint256 _tenderId)
        external
        tenderExists(_tenderId)
        onlyOfficer(_tenderId)
        notArchived(_tenderId)
        inStage(_tenderId, Stage.Advertised)
    {
        delete _tenderCriteria[_tenderId];
        tenders[_tenderId].prequalificationSkipped = true;
        tenders[_tenderId].state = Stage.Submitted;

        emit PrequalificationSkipped(_tenderId);
        emit SubmissionOpened(_tenderId);
    }

    /**
     * @notice Officer transitions tender from Advertised to PrequalificationOpen (legacy helper).
     * @param _tenderId Unique identifier of the tender.
     */
    function openPrequalification(uint256 _tenderId)
        external
        tenderExists(_tenderId)
        onlyOfficer(_tenderId)
        notArchived(_tenderId)
        inStage(_tenderId, Stage.Advertised)
    {
        tenders[_tenderId].state = Stage.PrequalificationOpen;
        emit PrequalificationOpened(_tenderId);
    }

    /**
     * @notice Bidder registers their intent to participate in prequalification.
     * @param _tenderId Unique identifier of the tender.
     */
    function registerBidder(uint256 _tenderId)
        external
        tenderExists(_tenderId)
        notArchived(_tenderId)
        inStage(_tenderId, Stage.PrequalificationOpen)
    {
        require(!isAuthorizedOfficer[msg.sender] && msg.sender != admin, "Procurement officers cannot participate as bidders");
        require(!bidders[_tenderId][msg.sender].registered, "Bidder already registered");

        bidders[_tenderId][msg.sender].bidderAddress = msg.sender;
        bidders[_tenderId][msg.sender].registered = true;
        _registeredBidders[_tenderId].push(msg.sender);

        emit BidderRegistered(_tenderId, msg.sender);
    }

    /**
     * @notice Officer approves prequalification for a registered bidder.
     * @param _tenderId Unique identifier of the tender.
     * @param _bidder Address of the registered bidder.
     */
    function approvePrequalification(uint256 _tenderId, address _bidder)
        external
        tenderExists(_tenderId)
        onlyOfficer(_tenderId)
        notArchived(_tenderId)
        inStage(_tenderId, Stage.PrequalificationOpen)
    {
        require(bidders[_tenderId][_bidder].registered, "Bidder is not registered");
        require(!bidders[_tenderId][_bidder].prequalified, "Bidder already prequalified");

        bidders[_tenderId][_bidder].prequalified = true;
        emit BidderPrequalified(_tenderId, _bidder);
    }

    // --- Stage 3: Submission ---
    /**
     * @notice Officer opens the submission window after prequalification is done.
     * @param _tenderId Unique identifier of the tender.
     */
    function openSubmission(uint256 _tenderId)
        external
        tenderExists(_tenderId)
        onlyOfficer(_tenderId)
        notArchived(_tenderId)
        inStage(_tenderId, Stage.PrequalificationOpen)
    {
        tenders[_tenderId].state = Stage.Submitted;
        emit SubmissionOpened(_tenderId);
    }

    /**
     * @notice Allows creating officer to set or adjust technical & financial evaluation weights
     *         after prequalification when the bidding stage begins, prior to tender opening.
     * @param _tenderId Unique identifier of the tender.
     * @param _weightTechnical Technical score weight percentage (e.g., 70).
     * @param _weightFinancial Financial score weight percentage (e.g., 30).
     */
    function setEvaluationWeights(
        uint256 _tenderId,
        uint256 _weightTechnical,
        uint256 _weightFinancial
    )
        external
        tenderExists(_tenderId)
        onlyOfficer(_tenderId)
        notArchived(_tenderId)
    {
        require(tenders[_tenderId].state <= Stage.Submitted, "Cannot set weights after tender is opened");
        require(_weightTechnical + _weightFinancial == 100, "Weights must sum to 100%");
        require(_weightTechnical > 0 && _weightFinancial > 0, "Individual weights must be positive");

        tenders[_tenderId].weightTechnical = _weightTechnical;
        tenders[_tenderId].weightFinancial = _weightFinancial;

        emit EvaluationWeightsSet(_tenderId, _weightTechnical, _weightFinancial);
    }
    /**
     * @notice Commercial contractor purchases tender dossier / pays required participation fee in crypto.
     * @param _tenderId Unique identifier of the tender.
     */
    function purchaseTenderDocument(uint256 _tenderId)
        external
        payable
        tenderExists(_tenderId)
        notArchived(_tenderId)
    {
        require(!isAuthorizedOfficer[msg.sender] && msg.sender != admin, "Procurement officers cannot purchase tender documents");
        require(!hasPurchasedTender[_tenderId][msg.sender], "Tender document already purchased");
        require(msg.value >= tenders[_tenderId].tenderFee, "Insufficient tender document fee sent");

        hasPurchasedTender[_tenderId][msg.sender] = true;
        tenderBalances[_tenderId] += msg.value;

        emit TenderDocumentPurchased(_tenderId, msg.sender, msg.value);
    }

    /**
     * @notice Allows creating officer to withdraw accumulated tender document purchase fees.
     * @param _tenderId Unique identifier of the tender.
     */
    function withdrawTenderFees(uint256 _tenderId)
        external
        tenderExists(_tenderId)
        onlyOfficer(_tenderId)
    {
        uint256 amount = tenderBalances[_tenderId];
        require(amount > 0, "No tender fees available for withdrawal");
        tenderBalances[_tenderId] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal transfer failed");

        emit TenderFeesWithdrawn(_tenderId, msg.sender, amount);
    }

    /**
     * @notice Eligible bidder submits document cryptographic fingerprint on-chain.
     * @param _tenderId Unique identifier of the tender.
     * @param _docHash Keccak256 hash of the proposal document.
     */
    function submitBid(uint256 _tenderId, bytes32 _docHash)
        external
        tenderExists(_tenderId)
        notArchived(_tenderId)
        inStage(_tenderId, Stage.Submitted)
    {
        require(!isAuthorizedOfficer[msg.sender] && msg.sender != admin, "Procurement officers cannot submit bids");
        if (tenders[_tenderId].tenderFee > 0) {
            require(hasPurchasedTender[_tenderId][msg.sender], "Must purchase tender document before submitting bid");
        }
        require(
            tenders[_tenderId].prequalificationSkipped || bidders[_tenderId][msg.sender].prequalified,
            "Bidder not prequalified"
        );
        require(block.timestamp <= tenders[_tenderId].deadline, "Submission deadline passed");
        require(_docHash != bytes32(0), "Document hash cannot be empty");
        
        Bidder storage b = bidders[_tenderId][msg.sender];
        require(!b.hasSubmitted || b.withdrawn, "Bid already submitted");

        if (!b.registered) {
            b.bidderAddress = msg.sender;
            b.registered = true;
            _registeredBidders[_tenderId].push(msg.sender);
        }

        b.docHash = _docHash;
        b.submissionTimestamp = block.timestamp;
        b.hasSubmitted = true;
        b.withdrawn = false;

        emit BidSubmitted(_tenderId, msg.sender, _docHash, block.timestamp);
    }

    /**
     * @notice Bidder withdraws an active submitted bid before tender opening/deadline.
     * @param _tenderId Unique identifier of the tender.
     */
    function withdrawBid(uint256 _tenderId)
        external
        tenderExists(_tenderId)
        notArchived(_tenderId)
        inStage(_tenderId, Stage.Submitted)
    {
        require(block.timestamp <= tenders[_tenderId].deadline, "Submission deadline passed");
        Bidder storage b = bidders[_tenderId][msg.sender];
        require(b.hasSubmitted && !b.withdrawn, "No active submitted bid to withdraw");

        b.withdrawn = true;
        b.hasSubmitted = false;

        emit BidWithdrawn(_tenderId, msg.sender, block.timestamp);
    }

    /**
     * @notice Bidder replaces an active submitted bid with a new proposal document hash.
     * @param _tenderId Unique identifier of the tender.
     * @param _newDocHash Keccak256 hash of the replacement proposal document.
     */
    function substituteBid(uint256 _tenderId, bytes32 _newDocHash)
        external
        tenderExists(_tenderId)
        notArchived(_tenderId)
        inStage(_tenderId, Stage.Submitted)
    {
        require(block.timestamp <= tenders[_tenderId].deadline, "Submission deadline passed");
        require(_newDocHash != bytes32(0), "Document hash cannot be empty");
        Bidder storage b = bidders[_tenderId][msg.sender];
        require(b.hasSubmitted && !b.withdrawn, "No active submitted bid to substitute");

        bytes32 oldDocHash = b.docHash;
        require(oldDocHash != _newDocHash, "New hash must be different from current hash");

        b.docHash = _newDocHash;
        b.submissionTimestamp = block.timestamp;

        emit BidSubstituted(_tenderId, msg.sender, oldDocHash, _newDocHash);
    }

    // --- Stage 4: Opening ---
    /**
     * @notice Officer opens tender bids after deadline has expired.
     * @param _tenderId Unique identifier of the tender.
     */
    function openTender(uint256 _tenderId)
        external
        tenderExists(_tenderId)
        onlyOfficer(_tenderId)
        notArchived(_tenderId)
        inStage(_tenderId, Stage.Submitted)
    {
        require(block.timestamp >= tenders[_tenderId].deadline, "Deadline has not yet passed");

        tenders[_tenderId].state = Stage.Opened;
        tenders[_tenderId].openedTimestamp = block.timestamp;

        emit TenderOpened(_tenderId, block.timestamp);
    }

    // --- Stage 5: Evaluation ---
    /**
     * @notice Officer enters technical and financial scores for a submitted bidder.
     * @dev Scores are write-once per bidder.
     * @param _tenderId Unique identifier of the tender.
     * @param _bidder Address of the submitted bidder.
     * @param _technicalScore Technical score (0-100).
     * @param _financialScore Financial score (0-100).
     */
    function submitEvaluation(
        uint256 _tenderId,
        address _bidder,
        uint256 _technicalScore,
        uint256 _financialScore
    )
        external
        tenderExists(_tenderId)
        onlyOfficer(_tenderId)
        notArchived(_tenderId)
    {
        Stage currentState = tenders[_tenderId].state;
        require(
            currentState == Stage.Opened || currentState == Stage.Evaluated,
            "Tender must be Opened or in Evaluation stage"
        );
        require(
            bidders[_tenderId][_bidder].hasSubmitted && !bidders[_tenderId][_bidder].withdrawn,
            "Bidder has not submitted a bid"
        );
        require(!bidders[_tenderId][_bidder].evaluated, "Bidder has already been evaluated");

        uint256 totalScore = (_technicalScore * tenders[_tenderId].weightTechnical) +
                             (_financialScore * tenders[_tenderId].weightFinancial);

        Bidder storage b = bidders[_tenderId][_bidder];
        b.technicalScore = _technicalScore;
        b.financialScore = _financialScore;
        b.totalScore = totalScore;
        b.evaluated = true;

        tenders[_tenderId].state = Stage.Evaluated;

        emit BidEvaluated(
            _tenderId,
            _bidder,
            _technicalScore,
            _financialScore,
            totalScore
        );
    }

    // --- Stage 6: Award ---
    /**
     * @notice Officer triggers contract to evaluate highest score and award the contract on-chain.
     * @param _tenderId Unique identifier of the tender.
     */
    function awardTender(uint256 _tenderId)
        external
        tenderExists(_tenderId)
        onlyOfficer(_tenderId)
        notArchived(_tenderId)
        inStage(_tenderId, Stage.Evaluated)
    {
        address[] memory registered = _registeredBidders[_tenderId];
        uint256 submittedCount = 0;
        address bestBidder = address(0);
        uint256 highestScore = 0;

        for (uint256 i = 0; i < registered.length; i++) {
            address bAddr = registered[i];
            Bidder storage b = bidders[_tenderId][bAddr];

            if (b.hasSubmitted && !b.withdrawn) {
                require(b.evaluated, "Not all submitted bidders have been evaluated");
                submittedCount++;

                if (bestBidder == address(0) || b.totalScore > highestScore) {
                    highestScore = b.totalScore;
                    bestBidder = bAddr;
                }
            }
        }

        require(submittedCount > 0, "No submitted bids found to award");
        require(bestBidder != address(0), "No valid winner identified");

        tenders[_tenderId].winner = bestBidder;
        tenders[_tenderId].winningScore = highestScore;
        tenders[_tenderId].state = Stage.Awarded;

        emit TenderAwarded(_tenderId, bestBidder, highestScore);
    }

    // --- Stage 7: Archiving ---
    /**
     * @notice Officer seals the tender record with a final document cryptographic hash.
     * @dev Once archived, all state-changing functions on this tender revert permanently.
     * @param _tenderId Unique identifier of the tender.
     * @param _finalDocHash Keccak256 hash of final signed contract / audit report.
     */
    function archiveTender(uint256 _tenderId, bytes32 _finalDocHash)
        external
        tenderExists(_tenderId)
        onlyOfficer(_tenderId)
        notArchived(_tenderId)
        inStage(_tenderId, Stage.Awarded)
    {
        require(_finalDocHash != bytes32(0), "Final document hash cannot be empty");

        tenders[_tenderId].finalDocHash = _finalDocHash;
        tenders[_tenderId].archivedTimestamp = block.timestamp;
        tenders[_tenderId].state = Stage.Archived;

        emit TenderArchived(_tenderId, _finalDocHash, block.timestamp);
    }

    // --- View / Read Functions for Frontend & Audit ---
    function getTender(uint256 _tenderId)
        external
        view
        tenderExists(_tenderId)
        returns (Tender memory)
    {
        return tenders[_tenderId];
    }

    function getTenderCriteria(uint256 _tenderId)
        external
        view
        tenderExists(_tenderId)
        returns (Criterion[] memory)
    {
        return _tenderCriteria[_tenderId];
    }

    function getBidder(uint256 _tenderId, address _bidder)
        external
        view
        tenderExists(_tenderId)
        returns (Bidder memory)
    {
        return bidders[_tenderId][_bidder];
    }

    function getRegisteredBidders(uint256 _tenderId)
        external
        view
        tenderExists(_tenderId)
        returns (address[] memory)
    {
        return _registeredBidders[_tenderId];
    }

    function getSubmittedBidders(uint256 _tenderId)
        external
        view
        tenderExists(_tenderId)
        returns (address[] memory)
    {
        address[] memory registered = _registeredBidders[_tenderId];
        uint256 count = 0;
        for (uint256 i = 0; i < registered.length; i++) {
            if (bidders[_tenderId][registered[i]].hasSubmitted && !bidders[_tenderId][registered[i]].withdrawn) {
                count++;
            }
        }

        address[] memory submitted = new address[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < registered.length; i++) {
            if (bidders[_tenderId][registered[i]].hasSubmitted && !bidders[_tenderId][registered[i]].withdrawn) {
                submitted[index] = registered[i];
                index++;
            }
        }
        return submitted;
    }

    function hasBidderPurchasedTender(uint256 _tenderId, address _bidder)
        external
        view
        tenderExists(_tenderId)
        returns (bool)
    {
        return hasPurchasedTender[_tenderId][_bidder];
    }
}

