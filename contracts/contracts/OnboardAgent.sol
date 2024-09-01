// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "./interfaces/IOracle.sol";

contract OnboardAgent {
    string public prompt;

    struct AgentRun {
        address owner;
        IOracle.Message[] messages;
        uint responsesCount;
        uint8 max_iterations;
        bool is_finished;
    }

    // @notice Mapping from run ID to AgentRun
    mapping(uint => AgentRun) public agentRuns;
    uint private agentRunCount;

    // @notice Event emitted when a new agent run is created
    event AgentRunCreated(address indexed owner, uint indexed runId);

    // @notice Address of the contract owner
    address private owner;

    // @notice Address of the oracle contract
    address public oracleAddress;

    // @notice Event emitted when the oracle address is updated
    event OracleAddressUpdated(address indexed newOracleAddress);

    // @notice Configuration for the OpenAI request
    IOracle.OpenAiRequest private config;

    // @param initialOracleAddress Initial address of the oracle contract
    // @param systemPrompt Initial prompt for the system message
    constructor(address initialOracleAddress, string memory systemPrompt) {
        owner = msg.sender;
        oracleAddress = initialOracleAddress;
        prompt = systemPrompt;

        config = IOracle.OpenAiRequest({
            model: "gpt-4-turbo-preview",
            frequencyPenalty: 21, // > 20 for null
            logitBias: "", // empty str for null
            maxTokens: 1000, // 0 for null
            presencePenalty: 21, // > 20 for null
            responseFormat: '{"type":"text"}',
            seed: 0, // null
            stop: "", // null
            temperature: 10, // Example temperature (scaled up, 10 means 1.0), > 20 means null
            topP: 101, // Percentage 0-100, > 100 means null
            tools: '[{\"type\":\"function\",\"function\":{\"name\":\"web_search\",\"description\":\"Search the internet\",\"parameters\":{\"type\":\"object\",\"properties\":{\"query\":{\"type\":\"string\",\"description\":\"Search query\"}},\"required\":[\"query\"]}}},{\"type\":\"function\",\"function\":{\"name\":\"image_generation\",\"description\":\"Generates an image using Dalle-2\",\"parameters\":{\"type\":\"object\",\"properties\":{\"prompt\":{\"type\":\"string\",\"description\":\"Dalle-2 prompt to generate an image\"}},\"required\":[\"prompt\"]}}},{\"type\":\"function\",\"function\":{\"name\":\"code_interpreter\",\"description\":\"Evaluates python code in a sandbox environment. The environment resets on every execution. You must send the whole script every time and print your outputs. Script should be pure python code that can be evaluated. It should be in python format NOT markdown. The code should NOT be wrapped in backticks. All python packages including requests, matplotlib, scipy, numpy, pandas, etc are available. Output can only be read from stdout, and stdin. Do not use things like plot.show() as it will not work. print() any output and results so you can capture the output.\",\"parameters\":{\"type\":\"object\",\"properties\":{\"code\":{\"type\":\"string\",\"description\":\"The pure python script to be evaluated. The contents will be in main.py. It should not be in markdown format.\"}},\"required\":[\"code\"]}}}]',
            toolChoice: "auto", // "none" or "auto"
            user: "" // null
        });
    }

    function handleIntent(string memory intent, string memory data) public {
        if (compareStrings(intent, "cast_to_farcaster")) {
            // Generate content using LLM and return to frontend
            runAgent(intent, data, 5);
        } else {
            // If no intent is determined, generate content normally
            runAgent(intent, data, 5);
        }
    }

    function modifySystemPrompt(string memory intent) private {
        if (compareStrings(intent, "cast_to_farcaster")) {
            prompt = "Assist the user in generating content for Farcaster. This may include text content, image content, or both. Ensure the content is engaging and suitable for posting on a decentralized social platform.";
        } else {
            prompt = "You are an advanced AI assistant designed to onboard and guide users through various Web3 and blockchain operations. Your capabilities include:\n\n1. Token swaps: Assist users in exchanging one cryptocurrency for another.\n2. Token bridging: Help users transfer tokens between different blockchain networks.\n3. Social media interactions: Guide users in creating posts on decentralized social platforms like Lens or Farcaster.\n4. Asset viewing: Provide information about a user's digital assets across various blockchains.\n5. NFT generation: Assist in the process of creating and minting new NFTs.\n\nWhen responding to queries:\n- Provide technically accurate and detailed information.\n- Prioritize security and best practices in all operations.\n- Explain complex concepts in a clear, concise manner.\n- When multiple steps are required, break them down clearly.\n- If a user's request is unclear or could lead to potential issues, ask for clarification.\n- Do not execute more operations than necessary to complete the user's request.\n- If a task cannot be completed in a single interaction, explain why and what further steps might be needed.\n\nRemember, your role is to guide and educate, ensuring users make informed decisions in their blockchain interactions.";
        }
    }

    // @notice Ensures the caller is the contract owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not owner");
        _;
    }

    // @notice Ensures the caller is the oracle contract
    modifier onlyOracle() {
        require(msg.sender == oracleAddress, "Caller is not oracle");
        _;
    }

    // @notice Updates the oracle address
    // @param newOracleAddress The new oracle address to set
    function setOracleAddress(address newOracleAddress) public onlyOwner {
        oracleAddress = newOracleAddress;
        emit OracleAddressUpdated(newOracleAddress);
    }

    // @notice Starts a new agent run
    // @param intent The user intent
    // @param query The initial user query
    // @param max_iterations The maximum number of iterations for the agent run
    // @return The ID of the newly created agent run
    function runAgent(
        string memory intent,
        string memory query,
        uint8 max_iterations
    ) public returns (uint) {
        modifySystemPrompt(intent);

        AgentRun storage run = agentRuns[agentRunCount];

        run.owner = msg.sender;
        run.is_finished = false;
        run.responsesCount = 0;
        run.max_iterations = max_iterations;

        IOracle.Message memory systemMessage = createTextMessage(
            "system",
            prompt
        );
        run.messages.push(systemMessage);

        IOracle.Message memory newMessage = createTextMessage("user", query);
        run.messages.push(newMessage);

        uint currentId = agentRunCount;
        agentRunCount = agentRunCount + 1;

        IOracle(oracleAddress).createOpenAiLlmCall(currentId, config);
        emit AgentRunCreated(run.owner, currentId);

        return currentId;
    }

    // @notice Handles the response from the oracle for an OpenAI LLM call
    // @param runId The ID of the agent run
    // @param response The response from the oracle
    // @param errorMessage Any error message
    // @dev Called by teeML oracle
    function onOracleOpenAiLlmResponse(
        uint runId,
        IOracle.OpenAiResponse memory response,
        string memory errorMessage
    ) public onlyOracle {
        AgentRun storage run = agentRuns[runId];

        if (!compareStrings(errorMessage, "")) {
            IOracle.Message memory newMessage = createTextMessage(
                "assistant",
                errorMessage
            );
            run.messages.push(newMessage);
            run.responsesCount++;
            run.is_finished = true;
            return;
        }
        if (run.responsesCount >= run.max_iterations) {
            run.is_finished = true;
            return;
        }
        if (!compareStrings(response.content, "")) {
            IOracle.Message memory newMessage = createTextMessage(
                "assistant",
                response.content
            );
            run.messages.push(newMessage);
            run.responsesCount++;
        }
        if (!compareStrings(response.functionName, "")) {
            IOracle(oracleAddress).createFunctionCall(
                runId,
                response.functionName,
                response.functionArguments
            );
            return;
        }
        run.is_finished = true;
    }

    // @notice Handles the response from the oracle for a function call
    // @param runId The ID of the agent run
    // @param response The response from the oracle
    // @param errorMessage Any error message
    // @dev Called by teeML oracle
    function onOracleFunctionResponse(
        uint runId,
        string memory response,
        string memory errorMessage
    ) public onlyOracle {
        AgentRun storage run = agentRuns[runId];
        require(!run.is_finished, "Run is finished");

        string memory result = response;
        if (!compareStrings(errorMessage, "")) {
            result = errorMessage;
        }

        IOracle.Message memory newMessage = createTextMessage("assistant", result);
        run.messages.push(newMessage);
        run.responsesCount++;
        IOracle(oracleAddress).createOpenAiLlmCall(runId, config);
    }

    // @notice Retrieves the message history for a given agent run
    // @param agentId The ID of the agent run
    // @return An array of messages
    function getMessageHistory(
        uint agentId
    ) public view returns (IOracle.Message[] memory) {
        return agentRuns[agentId].messages;
    }

    // @notice Checks if a given agent run is finished
    // @param runId The ID of the agent run
    // @return True if the run is finished, false otherwise
    function isRunFinished(uint runId) public view returns (bool) {
        return agentRuns[runId].is_finished;
    }

    // @notice Creates a text message with the given role and content
    // @param role The role of the message
    // @param content The content of the message
    // @return The created message
    function createTextMessage(
        string memory role,
        string memory content
    ) private pure returns (IOracle.Message memory) {
        IOracle.Message memory newMessage = IOracle.Message({
            role: role,
            content: new IOracle.Content[](1)
        });
        newMessage.content[0].contentType = "text";
        newMessage.content[0].value = content;
        return newMessage;
    }

    // @notice Compares two strings for equality
    // @param a The first string
    // @param b The second string
    // @return True if the strings are equal, false otherwise
    function compareStrings(
        string memory a,
        string memory b
    ) private pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) ==
            keccak256(abi.encodePacked((b))));
    }
}
