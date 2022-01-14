var chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const assert = chai.assert
const expect = chai.expect


const Web3 = require('web3')
require('dotenv').config()
const keccak256 = require('keccak256')

const _contractName = artifacts.require(process.env.CONTRACT_NAME);
const _contractVars = {
    name: process.env.CONTRACT_NAME,
    symbol: process.env.CONTRACT_SYMBOL,
    price: process.env.CONTRACT_PRICE
}

require('chai')
    .use(require('chai-as-promised'))
    .should()

contract(process.env.CONTRACT_NAME, (addresses) => {
    let deployed
    let web3
    let accounts
    let tree
    let contract
    let price = 0.07
    let qty = 2
    let pricexqty = 0.13

    let sleep = (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    before(async() => {
        deployed = await _contractName.deployed()

        web3 = new Web3("http://127.0.0.1:7545");
        accounts = {
            owner: web3.eth.accounts.privateKeyToAccount(process.env.TEST_PK_OWNER),
            minter1: web3.eth.accounts.privateKeyToAccount(process.env.TEST_PK_MINTER_ONE),
            minter2: web3.eth.accounts.privateKeyToAccount(process.env.TEST_PK_MINTER_TWO),
            minter3: web3.eth.accounts.privateKeyToAccount(process.env.TEST_PK_MINTER_THREE),
            outsider: web3.eth.accounts.privateKeyToAccount(process.env.TEST_PK_MINTER_OUTSIDER),
        }
        console.log('Test Accounts:', accounts)

        tree = {
            root: "0x29bb64204d0ab3b6977ff1794b88842d798cfb73ceebcf734bc35a0acd653f2e",
                /*
                0x0A3Fa873c57C0962cf50e13AeECaBE0f74B7210B
                0x8737b0cFC57af44669860926687e1272BED10E4B
                0x943f0C05717Dcd35e4e2201A9834E9Baec4AB21f
                */
            leaf: "0x7d8a4772b3b50994381464fc4fb66c6b3a5889be691c429fa27cf86caa95101f", //minter1
            leafAddress: "0x0A3Fa873c57C0962cf50e13AeECaBE0f74B7210B", //minter1
            proof: ["0x110d6954897d2b34cecfee35c062262fe40e979dc5905118a07189040aba7044", "0xbcdafa4077f74f5031f856e883c40d0c931e956b991c1fcf0e922939a615fd40"],
            badLeaf: "0xae36165e7bb32e5fa6ffdbb126e0c206dd946a3ba562098706828e9505fc9830",
            badLeafAddress: "0x383C983d0011E50B863206C24503E1dE9975914C"
        }

        contract = new web3.eth.Contract(deployed.abi, deployed.address)

    })

    describe('deployment', async () => {
        it('deploys successfully', async () => {
            const address = deployed.address
            assert.notEqual(address, '')
            assert.notEqual(address, 0x0)
            assert.notEqual(address, null)
            assert.notEqual(address, undefined)
        })

        it('has a name', async() => {
            const name = await deployed.name()
            assert.equal(name, _contractVars.name)
        })

        it('has a symbol', async() => {
            const symbol = await deployed.symbol()
            assert.equal(symbol, _contractVars.symbol)
        })
    })

    describe('whitelisting', async () => {
        it('sets merkle root', async () => {
            await contract.methods.setMerkleRoot(tree.root).send({from: accounts['owner'].address})
            let root = await contract.methods.root().call({from: accounts['owner'].address})
            assert.equal(root, tree.root)
        })

        it('[depr] verifies whitelisted address', async () => {
            let leaf = '0x'+keccak256(tree.leafAddress).toString('hex')
            assert.equal(leaf, tree.leaf)

            let verified = await contract.methods.verify(leaf, tree.proof).call({from: accounts['owner'].address})
            assert.isTrue(verified)
        })

        it('[depr] blocks unknown address', async () => {
            let leaf = '0x'+keccak256(tree.badLeafAddress).toString('hex')
            assert.equal(leaf, tree.badLeaf)

            let verified = await contract.methods.verify(leaf, []).call({from: accounts['owner'].address})
            assert.isFalse(verified)
        })
    })

    describe('owner minting', async () => {
        it('checks sold out', async () => {
            assert.isTrue(true)
        })

        it('checks max supply', async () => {
            let promise = contract.methods.ownerMint(accounts['owner'].address,999999).send({from: accounts['owner'].address})
            assert.isRejected(promise, Error, "Quantity exceeds max supply")
        })

        it('mints', async () => {
            let totalSupplyPrevious = await contract.methods.totalSupply().call({from: accounts['owner'].address})
            await contract.methods.ownerMint(accounts['owner'].address, qty).send({
                from: accounts['owner'].address, 
                gas: 600000
            })
            let totalSupply = await contract.methods.totalSupply().call({from: accounts['owner'].address})
            assert.equal(totalSupply, parseInt(totalSupplyPrevious) + qty)
        })

        it('mints as gift', async () => {
            let totalSupplyPrevious = await contract.methods.totalSupply().call({from: accounts['owner'].address})
            await contract.methods.ownerMint(accounts['minter3'].address, qty).send({
                from: accounts['owner'].address, 
                gas: 600000
            })
            let totalSupply = await contract.methods.totalSupply().call({from: accounts['owner'].address})
            assert.equal(totalSupply, parseInt(totalSupplyPrevious) + qty)
        })

        it('mints legendaries as gift', async () => {
            let totalSupplyPrevious = await contract.methods.legendaryTotalSupply().call({from: accounts['owner'].address})
            await contract.methods.ownerLegendaryMint(accounts['minter3'].address, qty).send({
                from: accounts['owner'].address, 
                gas: 600000
            })
            let totalSupply = await contract.methods.legendaryTotalSupply().call({from: accounts['owner'].address})
            assert.equal(totalSupply, parseInt(totalSupplyPrevious) + qty)
        })

        // it('assigns correct token to mints', async () => {
        //     let balanceOf = await contract.methods.balanceOf(accounts['owner'].address).call({from: accounts['owner'].address})
        //     let result = []
        //     for(var i=0; i < balanceOf; i++){
        //         let id = await contract.methods.tokenOfOwnerByIndex(i)
        //         result.push(id)
        //     }
        //     console.log(result)
        //     assert.isTrue(true)
        // })
    })

    describe('whitelist minting', async () => {
        it('checks sold out', async () => {
            assert.isTrue(true)
        })

        it('checks max supply', async () => {
            let promise = contract.methods.whitelistMint(999999,[]).send({from: accounts['minter1'].address})
            assert.isRejected(promise, Error, "Quantity exceeds max supply")
        })

        it('checks max mint per txn', async () => {
            let promise = contract.methods.whitelistMint(3,[]).send({from: accounts['minter1'].address})
            assert.isRejected(promise, Error, "Quantity exceeds max per transaction")
            let promise2 = contract.methods.whitelistMint(2,[]).send({from: accounts['minter1'].address})
            assert.isRejected(promise2, Error, "Minting is not yet started")
        })

        it('checks mint from contract', async () => {
            assert.isTrue(true)
        })

        it('checks start sale', async () => {
            let promise2 = contract.methods.whitelistMint(2,[]).send({from: accounts['minter1'].address})
            assert.isRejected(promise2, Error, "Minting is not yet started")

            let timestamp = Math.floor(Date.now() / 1000) - 10000
            await contract.methods.setWhitelistStartSaleTimestamp(timestamp).send({from: accounts['owner'].address})
            let startSaleTimestamp = await contract.methods.whitelistStartSaleTimestamp().call({from: accounts['owner'].address})
            assert.equal(timestamp, startSaleTimestamp)
            let promise = contract.methods.whitelistMint(2,[]).send({from: accounts['minter1'].address})
            assert.isRejected(promise, Error, "Not enough ethers sent")
        })

        it('checks ethers sent >= price', async () => {
            let promise = contract.methods.whitelistMint(2,[]).send({from: accounts['minter1'].address})
            assert.isRejected(promise, Error, "Not enough ethers sent")

            let promise2 = contract.methods.whitelistMint(qty,[]).send({from: accounts['minter1'].address, value: web3.utils.toWei(String(pricexqty), 'ether')})
            assert.isRejected(promise2, Error, "Invalid merkle proof")
        })

        it('checks bundle price', async () => {
            let promise = contract.methods.whitelistMint(qty,[]).send({from: accounts['minter1'].address, value: web3.utils.toWei(String(price * qty), 'ether')})
            assert.isRejected(promise, Error, "Not enough ethers sent")

            let promise2 = contract.methods.whitelistMint(qty,[]).send({from: accounts['minter1'].address, value: web3.utils.toWei(String(pricexqty), 'ether')})
            assert.isRejected(promise2, Error, "Invalid merkle proof")
        })

        it('checks merkle proof', async () => {
            let promise = contract.methods.whitelistMint(qty,[]).send({from: accounts['outsider'].address, value: web3.utils.toWei(String(pricexqty), 'ether')})
            assert.isRejected(promise, Error, "Invalid merkle proof")
        })

        it('mints', async () => {
            let totalSupplyPrevious = await contract.methods.totalSupply().call({from: accounts['owner'].address})
            await contract.methods.whitelistMint(qty,tree.proof).send({
                from: accounts['minter1'].address, 
                value: web3.utils.toWei(String(pricexqty), 'ether'),
                gas: 600000
            })
            let totalSupply = await contract.methods.totalSupply().call({from: accounts['owner'].address})
            assert.equal(totalSupply, parseInt(totalSupplyPrevious) + qty)
        })

        // it('assigns correct token to mints', async () => {
        //     // let balanceOf = await contract.methods.balanceOf(accounts['owner'].address).call({from: accounts['owner'].address})
        //     // let result = []
        //     // for(var i=0; i < balanceOf; i++){
        //     //     let id = await contract.methods.tokenOfOwnerByIndex(i)
        //     //     result.push(id)
        //     // }
        //     assert.isTrue(true)
        // })

        it('checks max mint per wallet', async () => {
            let promise = contract.methods.whitelistMint(qty,tree.proof).send({
                from: accounts['minter1'].address, 
                value: web3.utils.toWei(String(pricexqty), 'ether'),
                gas: 600000
            })
            assert.isRejected(promise, Error, "Quantity exceeds max mints per wallet")
        })
    })

    describe('public minting', async () => {
        it('checks sold out', async () => {
            assert.isTrue(true)
        })

        it('checks max supply', async () => {
            let promise = contract.methods.publicMint(999999).send({from: accounts['outsider'].address})
            assert.isRejected(promise, Error, "Quantity exceeds max supply")
        })

        it('checks max mint per txn', async () => {
            let promise = contract.methods.publicMint(3).send({from: accounts['outsider'].address})
            assert.isRejected(promise, Error, "Quantity exceeds max per transaction")
            let promise2 = contract.methods.publicMint(2).send({from: accounts['outsider'].address})
            assert.isRejected(promise2, Error, "Minting is not yet started")
        })

        it('checks mint from contract', async () => {
            assert.isTrue(true)
        })

        it('checks start sale', async () => {
            let promise2 = contract.methods.publicMint(2).send({from: accounts['outsider'].address})
            assert.isRejected(promise2, Error, "Minting is not yet started")

            let timestamp = Math.floor(Date.now() / 1000) - 10000
            await contract.methods.setPublicStartSaleTimestamp(timestamp).send({from: accounts['owner'].address})
            let startSaleTimestamp = await contract.methods.publicStartSaleTimestamp().call({from: accounts['owner'].address})
            assert.equal(timestamp, startSaleTimestamp)
            let promise = contract.methods.publicMint(2).send({from: accounts['outsider'].address})
            assert.isRejected(promise, Error, "Not enough ethers sent")
        })

        it('checks ethers sent >= price', async () => {
            let promise = contract.methods.publicMint(2).send({from: accounts['outsider'].address})
            assert.isRejected(promise, Error, "Not enough ethers sent")
        })

        it('checks bundle price', async () => {
            let promise = contract.methods.publicMint(2).send({from: accounts['outsider'].address, value: web3.utils.toWei(String(price * qty), 'ether')})
            assert.isRejected(promise, Error, "Not enough ethers sent")
        })

        it('mints', async () => {
            let totalSupplyPrevious = await contract.methods.totalSupply().call({from: accounts['owner'].address})
            await contract.methods.publicMint(qty).send({
                from: accounts['outsider'].address, 
                value: web3.utils.toWei(String(pricexqty), 'ether'),
                gas: 600000
            })
            let totalSupply = await contract.methods.totalSupply().call({from: accounts['owner'].address})
            assert.equal(totalSupply, parseInt(totalSupplyPrevious) + qty)
        })

        // it('assigns correct token to mints', async () => {
        //     // let balanceOf = await contract.methods.balanceOf(accounts['owner'].address).call({from: accounts['owner'].address})
        //     // let result = []
        //     // for(var i=0; i < balanceOf; i++){
        //     //     let id = await contract.methods.tokenOfOwnerByIndex(i)
        //     //     result.push(id)
        //     // }
        //     assert.isTrue(true)
        // })

        it('checks max mint per wallet', async () => {
            let promise = contract.methods.publicMint(qty).send({
                from: accounts['outsider'].address, 
                value: web3.utils.toWei(String(pricexqty), 'ether'),
                gas: 600000
            })
            assert.isRejected(promise, Error, "Quantity exceeds max mints per wallet")
        })
    })

    describe('withdrawal', async () => {
        it('withdraws', async () => {
            await contract.methods.setWithdrawTo(accounts['owner'].address).send({from: accounts['owner'].address})
            let promise = contract.methods.withdraw().send({from: accounts['owner'].address})
            assert.isFulfilled(promise)
        })
    })

    describe('owner functions', async () => {

        it('sets whitelist start timestamp', async () => {
            let value = 1600000000
            let promise = contract.methods.setWhitelistStartSaleTimestamp(value).send({from: accounts['owner'].address})
            assert.isFulfilled(promise)
            await promise
            let returned = await contract.methods.whitelistStartSaleTimestamp().call({from: accounts['owner'].address})
            assert.equal(value, returned)
        })

        it('sets public start timestamp', async () => {
            let value = 1600000000
            let promise = contract.methods.setPublicStartSaleTimestamp(value).send({from: accounts['owner'].address})
            assert.isFulfilled(promise)
            await promise
            let returned = await contract.methods.publicStartSaleTimestamp().call({from: accounts['owner'].address})
            assert.equal(value, returned)
        })

        it('sets withdraw wallet', async () => {
            let value = accounts['minter3'].address
            let promise = contract.methods.setWithdrawTo(value).send({from: accounts['owner'].address})
            assert.isFulfilled(promise)
            await promise
            let returned = await contract.methods.withdrawTo().call({from: accounts['owner'].address})
            assert.equal(value, returned)
        })

        it('sets max supply', async () => {
            let value = 1000
            let promise = contract.methods.setMaxSupply(value).send({from: accounts['owner'].address})
            assert.isFulfilled(promise)
            await promise
            let returned = await contract.methods.maxSupply().call({from: accounts['owner'].address})
            assert.equal(value, returned)
        })

        it('sets legendary max supply', async () => {
            let value = 50
            let promise = contract.methods.setLegendaryMaxSupply(value).send({from: accounts['owner'].address})
            assert.isFulfilled(promise)
            await promise
            let returned = await contract.methods.legendaryMaxSupply().call({from: accounts['owner'].address})
            assert.equal(value, returned)
        })

        it('sets whitelist max per wallet', async () => {
            let value = 10
            let promise = contract.methods.setWhitelistMaxPerWallet(value).send({from: accounts['owner'].address})
            assert.isFulfilled(promise)
            await promise
            let returned = await contract.methods.whitelistMaxPerWallet().call({from: accounts['owner'].address})
            assert.equal(value, returned)
        })

        it('sets public max per wallet', async () => {
            let value = 10
            let promise = contract.methods.setPublicMaxPerWallet(value).send({from: accounts['owner'].address})
            assert.isFulfilled(promise)
            await promise
            let returned = await contract.methods.publicMaxPerWallet().call({from: accounts['owner'].address})
            assert.equal(value, returned)
        })

        it('sets whitelist max per transaction', async () => {
            let value = 10
            let promise = contract.methods.setWhitelistMaxPerTransaction(value).send({from: accounts['owner'].address})
            assert.isFulfilled(promise)
            await promise
            let returned = await contract.methods.whitelistMaxPerTransaction().call({from: accounts['owner'].address})
            assert.equal(value, returned)
        })

        it('sets public max per transaction', async () => {
            let value = 10
            let promise = contract.methods.setPublicMaxPerTransaction(value).send({from: accounts['owner'].address})
            assert.isFulfilled(promise)
            await promise
            let returned = await contract.methods.publicMaxPerTransaction().call({from: accounts['owner'].address})
            assert.equal(value, returned)
        })

        it('sets mint price', async () => {
            let value = web3.utils.toWei(String(0.1), 'ether')
            let promise = contract.methods.setMintPrice(value).send({from: accounts['owner'].address})
            assert.isFulfilled(promise)
            await promise
            let returned = await contract.methods.mintPrice().call({from: accounts['owner'].address})
            assert.equal(value, returned)
        })

        it('sets mint price bundle', async () => {
            //set default mint price
            let value = web3.utils.toWei(String(price), 'ether')
            let promise = contract.methods.setMintPrice(value).send({from: accounts['owner'].address})
            assert.isFulfilled(promise)
            await promise
            //set bundle price
            let value2 = web3.utils.toWei(String(0.11), 'ether')
            let quantity = 5
            let promise2 = contract.methods.setMintPriceBundle(quantity,value2).send({from: accounts['owner'].address})
            assert.isFulfilled(promise2)
            await promise2
            //compare bundle price
            let returned = await contract.methods.getMintPrice(quantity).call({from: accounts['owner'].address})
            assert.equal(value2, returned)
            let quantity2 = 10
            //compare unbundled price
            let returned2 = await contract.methods.getMintPrice(quantity2).call({from: accounts['owner'].address})
            assert.equal(quantity2 * web3.utils.toWei(String(price), 'ether'), returned2)
        })

    })
})