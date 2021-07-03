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

const toBytes32 = (bn) => {
  return ethers.utils.hexlify(ethers.utils.zeroPad(bn.toHexString(), 32));
};

const DAI_ADDRESS = "0x6b175474e89094c44da98b954eedeac495271d0f";

// Slot 2 is found via command below
// npx slot20 balanceOf 0x6b175474e89094c44da98b954eedeac495271d0f 0x5d3a536e4d6dbd6114cc1ead35777bab948e3643
const DAI_SLOT = 2;

describe("Storage Manipulation", function () {
  it("Manipulate the balance of DAI", async function () {
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
    await setStorageAt(
      DAI_ADDRESS,
      index.toString(),
      toBytes32(locallyManipulatedBalance).toString()
    );

    // check post manipulation
    const after = await Dai.balanceOf(userAddress);
    expect(after.eq(locallyManipulatedBalance)).to.be.true;
  });

  it("Manipulate the Storage Contract state", async function () {
    const storage = await ethers
      .getContractFactory("Storage")
      .then((x) => x.deploy());

    const beforeA = await storage.a();
    const beforeB = await storage.b();

    expect(beforeA.eq(ethers.BigNumber.from("500"))).to.be.true;
    expect(beforeB.eq(ethers.BigNumber.from("1337"))).to.be.true;

    await setStorageAt(
      storage.address,
      "0x0",
      toBytes32(ethers.BigNumber.from("42")).toString()
    );
    await setStorageAt(
      storage.address,
      "0x1",
      toBytes32(ethers.BigNumber.from("41")).toString()
    );

    const afterA = await storage.a();
    const afterB = await storage.b();

    expect(afterA.eq(ethers.BigNumber.from("42"))).to.be.true;
    expect(afterB.eq(ethers.BigNumber.from("41"))).to.be.true;
  });
});
