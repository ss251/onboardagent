import { ethers } from "hardhat"
import dotenv from "dotenv"

dotenv.config()

const ONBOARD_AGENT_PROMPT = "You are a helpful assistant designed to onboard new users to our platform."

async function main() {
  const oracleAddress = process.env.ORACLE_ADDRESS

  if (!oracleAddress) {
    throw new Error("ORACLE_ADDRESS not set in .env file")
  }

  console.log(`Using Oracle address: ${oracleAddress}`)
  await deployOnboardAgent(oracleAddress)
}

async function deployOnboardAgent(oracleAddress: string) {
  const OnboardAgent = await ethers.getContractFactory("OnboardAgent")
  const onboardAgent = await OnboardAgent.deploy(oracleAddress, ONBOARD_AGENT_PROMPT)

  await onboardAgent.waitForDeployment()

  console.log(
    `OnboardAgent deployed to ${onboardAgent.target}`
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})