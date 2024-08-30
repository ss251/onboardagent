import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers"
import { expect } from "chai"
import { ethers } from "hardhat"

describe("OnboardAgent", function () {
  async function deploy() {
    const allSigners = await ethers.getSigners()
    const owner = allSigners[0]

    const Oracle = await ethers.getContractFactory("ChatOracle")
    const oracle = await Oracle.deploy()

    const OnboardAgent = await ethers.getContractFactory("OnboardAgent")
    const onboardAgent = await OnboardAgent.deploy("0x0000000000000000000000000000000000000000", "system prompt")

    return { onboardAgent, oracle, owner, allSigners }
  }

  describe("Deployment", function () {
    it("User can start agent run", async () => {
      const { onboardAgent, oracle, owner } = await loadFixture(deploy)
      await onboardAgent.setOracleAddress(oracle.target)

      await onboardAgent.runAgent("How do I get started?", 2)
      // promptId: 0, callbackId: 0
      const messages = await oracle.getMessagesAndRoles(0, 0)
      expect(messages.length).to.equal(2)
      expect(messages[0].content[0].value).to.equal("system prompt")
      expect(messages[1].content[0].value).to.equal("How do I get started?")
    })

    it("Oracle adds response and agent handles it", async () => {
      const {
        onboardAgent,
        oracle,
        owner,
        allSigners
      } = await loadFixture(deploy)
      const oracleAccount = allSigners[6]
      await onboardAgent.setOracleAddress(oracle.target)
      await oracle.updateWhitelist(oracleAccount, true)

      await onboardAgent.runAgent("How do I get started?", 2)
      const response = {
        id: "responseId",
        content: "Welcome! To get started, you can...",
        functionName: "",
        functionArguments: "",
        created: 1618888901,
        model: "gpt-4-turbo-preview",
        systemFingerprint: "systemFingerprintHere",
        object: "chat.completion",
        completionTokens: 10,
        promptTokens: 5,
        totalTokens: 15
      }
      await oracle.connect(oracleAccount).addOpenAiResponse(0, 0, response, "")
      const messages = await oracle.getMessagesAndRoles(0, 0)
      expect(messages.length).to.equal(3)
      expect(messages[1].content[0].value).to.equal("How do I get started?")
      expect(messages[2].content[0].value).to.equal("Welcome! To get started, you can...")
    })
  })
})