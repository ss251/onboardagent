import { ethers } from "hardhat"
import dotenv from "dotenv"

dotenv.config()

const DALLE_PROMPT = "Create a vibrant, futuristic NFT artwork representing: \""

async function main() {
  const oracleAddress = process.env.ORACLE_ADDRESS

  if (!oracleAddress) {
    throw new Error("ORACLE_ADDRESS not set in .env file")
  }

  console.log(`Using Oracle address: ${oracleAddress}`)
  await deployDalle(oracleAddress)
}

async function deployDalle(oracleAddress: string) {
  const DalleNft = await ethers.getContractFactory("DalleNft")
  const dalleNft = await DalleNft.deploy(oracleAddress, DALLE_PROMPT)

  await dalleNft.waitForDeployment()

  console.log(`Dall-e deployed to ${dalleNft.target}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})