const { parseUnits } = require("@ethersproject/units");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const erc20Abi = require("./erc20.json");

const mine = async () => {
  await ethers.provider.send("evm_mine", []);
};

const setStorageAt = async (address, index, value) => {
  await ethers.provider.send("hardhat_setStorageAt", [address, index, value]);
  await mine();
};

const DAI_ADDRESS = "0x6b175474e89094c44da98b954eedeac495271d0f";

// Slot 2 is found via command below
// npx slot20 balanceOf 0x6b175474e89094c44da98b954eedeac495271d0f 0x5d3a536e4d6dbd6114cc1ead35777bab948e3643
const DAI_SLOT = 2;

describe("Balance Manipulation", function () {
  it("Should manipulate the balance of DAI", async function () {
    const Dai = new ethers.Contract(DAI_ADDRESS, erc20Abi, ethers.provider);
    const locallyManipulatedBalance = parseUnits("100000");

    const [user] = await ethers.getSigners();
    const userAddress = await user.getAddress();

    // Check balance before
    const before = await Dai.balanceOf(userAddress);
    expect(before.eq(locallyManipulatedBalance)).to.be.false;

    // Get storage slot index
    const index = ethers.utils.solidityKeccak256(
      ["uint256", "uint256"],
      [userAddress, DAI_SLOT] // key, slot
    );

    // Manipulate local balance (needs to be bytes32 string)
    const valBytes32 = ethers.utils.hexlify(
      ethers.utils.zeroPad(locallyManipulatedBalance.toHexString(), 32)
    );
    await setStorageAt(DAI_ADDRESS, index.toString(), valBytes32.toString());

    // check post manipulation
    const after = await Dai.balanceOf(userAddress);
    expect(after.eq(locallyManipulatedBalance)).to.be.true;
  });
});
