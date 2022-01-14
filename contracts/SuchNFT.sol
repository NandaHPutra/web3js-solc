// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract SuchNFT is ERC721, Ownable  {
    //static variables
    uint256 public mintPrice;
    mapping(uint => uint256) public mintPriceBundle;
    uint256 public maxSupply;
    uint256 public legendaryMaxSupply;
    uint256 public whitelistMaxPerTransaction;
    uint256 public whitelistMaxPerWallet;
    uint256 public publicMaxPerTransaction;
    uint256 public publicMaxPerWallet;

    //state variables
    uint256 public whitelistStartSaleTimestamp;
    uint256 public publicStartSaleTimestamp;

    //whitelisting variables
    bytes32 public root;

    //contract variables
    string public _baseURI_;

    //trackers
    uint256 public totalSupply = 0;
    uint256 public legendaryTotalSupply = 0;
    uint256 public legendaryIndexOffset = 1000000000; //1 billion
    mapping(address => uint256) walletMints;

    //withdraw wallet
    address payable public withdrawTo;

    constructor() ERC721("SuchNFT", "MWOW") {
        mintPrice = 0.07 ether;
        mintPriceBundle[2] = 0.13 ether;
        mintPriceBundle[3] = 0.18 ether;   

        maxSupply = 5555;
        legendaryMaxSupply = 15;
        whitelistMaxPerTransaction = 2;
        whitelistMaxPerWallet = 2;
        publicMaxPerTransaction = 2;
        publicMaxPerWallet = 2;

        whitelistStartSaleTimestamp = 0;
        publicStartSaleTimestamp = 0;
    }

    //minting
    function mintMany(address _address, uint256 quantity) private {
        walletMints[_address] += quantity;
        for (uint256 i = 0; i < quantity; i++) {
            mint(_address);
        }
    }

    function mint(address _address) internal {
        uint256 tokenId = totalSupply + 1;
        _safeMint(_address, tokenId);
        totalSupply++;
    }

    function whitelistMint(uint quantity, bytes32[] memory proof) public payable
    {
        require(totalSupply < maxSupply, "Sold out");
        require(totalSupply + quantity <= maxSupply, "Quantity exceeds max supply");
        require(quantity <= whitelistMaxPerTransaction, "Quantity exceeds max per transaction");

        require(isContract(msg.sender) == false, "Cannot mint from a contract");
        require(whitelistStartSaleTimestamp > 0 && block.timestamp - whitelistStartSaleTimestamp > 0, "Minting is not yet started");
        require(msg.value == getMintPrice(quantity), "Not enough ethers sent");
        require(walletMints[msg.sender] + quantity <= whitelistMaxPerWallet,"Quantity exceeds max mints per wallet");

        require(verify(getLeaf(msg.sender), proof), "Invalid merkle proof");

        mintMany(msg.sender, quantity);
    }

    function publicMint(uint quantity) public payable
    {
        require(totalSupply < maxSupply, "Sold out");
        require(totalSupply + quantity <= maxSupply, "Quantity exceeds max supply");
        require(quantity <= publicMaxPerTransaction, "Quantity exceeds max per transaction");

        require(isContract(msg.sender) == false, "Cannot mint from a contract");
        require(publicStartSaleTimestamp > 0 && block.timestamp - publicStartSaleTimestamp > 0, "Minting is not yet started");
        require(msg.value == getMintPrice(quantity), "Not enough ethers sent");
        require(walletMints[msg.sender] + quantity <= publicMaxPerWallet,"Quantity exceeds max mints per wallet");

        mintMany(msg.sender, quantity);
    }

    function ownerMint(address _address, uint quantity) public payable onlyOwner 
    {
        require(totalSupply < maxSupply, "Sold out");
        require(totalSupply + quantity <= maxSupply, "Quantity exceeds max supply");

        mintMany(_address, quantity);
    }

    //legendary minting
    function legendaryMintMany(address _address, uint256 quantity) private {
        walletMints[_address] += quantity;
        for (uint256 i = 0; i < quantity; i++) {
            legendaryMint(_address);
        }
    }

    function legendaryMint(address _address) internal {
        uint256 tokenId = legendaryTotalSupply + 1 + legendaryIndexOffset;
        _safeMint(_address, tokenId);
        legendaryTotalSupply++;
    }

    function ownerLegendaryMint(address _address, uint quantity) public payable onlyOwner 
    {
        require(legendaryTotalSupply < legendaryMaxSupply, "Sold out");
        require(legendaryTotalSupply + quantity <= legendaryMaxSupply, "Quantity exceeds max supply");

        legendaryMintMany(_address, quantity);
    }

    //whitelisting
    function setMerkleRoot(bytes32 merkleroot) onlyOwner public 
    {
        root = merkleroot;
    }

    function verify(bytes32 leaf, bytes32[] memory proof) public view returns (bool)
    {//MUST BE SET TO INTERNAL FUNCTION
        return MerkleProof.verify(proof, root, leaf);
    }

    function getLeaf(address _address) private pure returns (bytes32)
    {
        return keccak256(abi.encodePacked(_address));
    }

    //owner functions
    function withdraw() onlyOwner public  {
        uint256 balance = address(this).balance;
        payable(withdrawTo).transfer(balance);
    }

    function setWithdrawTo(address _address) onlyOwner public  {
        withdrawTo = payable(_address);
    }

    function setMaxSupply(uint256 value) onlyOwner public  {
        maxSupply = value;
    }

    function setLegendaryMaxSupply(uint256 value) onlyOwner public  {
        legendaryMaxSupply = value;
    }

    function setWhitelistStartSaleTimestamp(uint256 value) onlyOwner public  {
        whitelistStartSaleTimestamp = value;
    }

    function setPublicStartSaleTimestamp(uint256 value) onlyOwner public  {
        publicStartSaleTimestamp = value;
    }

    function setWhitelistMaxPerTransaction(uint256 value) onlyOwner public  {
        whitelistMaxPerTransaction = value;
    }

    function setPublicMaxPerTransaction(uint256 value) onlyOwner public  {
        publicMaxPerTransaction = value;
    }

    function setWhitelistMaxPerWallet(uint256 value) onlyOwner public  {
        whitelistMaxPerWallet = value;
    }

    function setPublicMaxPerWallet(uint256 value) onlyOwner public  {
        publicMaxPerWallet = value;
    }

    function setMintPrice(uint256 priceWei) onlyOwner public  {
        mintPrice = priceWei;
    }

    function setMintPriceBundle(uint quantity, uint256 priceWei) onlyOwner public  {
        mintPriceBundle[quantity] = priceWei;
    }

    //helpers
    function isContract(address _address) private view returns (bool){
        uint32 size;
        assembly {
            size := extcodesize(_address)
        }
        return (size > 0);
    }

    function getMintPrice(uint quantity) public view returns(uint256){
        //MUST BE SET TO PRIVATE FUNCTION
        if(mintPriceBundle[quantity] > 0){
            return mintPriceBundle[quantity];
        }else{
            return mintPrice * quantity;
        }
    }
}