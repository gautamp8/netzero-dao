import {
  useAddress,
  useNetwork,
  ConnectWallet,
} from '@thirdweb-dev/react';
import { 
  Button,
  Box,
  Flex,
  Text,
  CircularProgress,
} from "@chakra-ui/react";
import { PieChart } from 'react-minimal-pie-chart';
import { 
  TransactionReceiptQuery,
  AccountId,
  PrivateKey,
  Client,
  Hbar,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  TransferTransaction,
  AccountBalanceQuery,
  TokenAssociateTransaction,
} from "@hashgraph/sdk"
import { useState, useEffect, useMemo } from 'react';
import { AddressZero } from '@ethersproject/constants';
import { calculateEmissions } from './emissions';
import DAO from './data/DAO.json';
import { ethers } from "ethers";

const App = () => {
  const address = useAddress();
  const network = useNetwork();

  console.log('👋 Address:', address);

  const ETHERSCAN_API_KEY = 'W43BF6PWCKDTI6D2BNGUYYGAQYRVUZSJIV';
  const DAO_CONTRACT = "0x3eAA0917966954a14D9F1874da8DceB015B239c5";
  const PREMINE_API_ENDPOINT = "https://dev-api.netzerohedera.xyz/premine"
  const TREASURY_API_ENDPOINT = new URL("https://dev-api.netzerohedera.xyz/treasury")
  const NFT_METADATA_URL = "https://dev-api.netzerohedera.xyz/m/p"

  // A Web3Provider wraps a standard Web3 provider, which is
  // what MetaMask injects as window.ethereum into each page
  const provider = new ethers.providers.Web3Provider(window.ethereum)
  const daoContract = new ethers.Contract(DAO_CONTRACT, DAO, provider);

  const options = [
    { value: 'ethereum', label: 'ETHEREUM MAINNET' },
    { value: 'Polygon', label: 'POLYGON MUMBAI' },
    { value: 'Binance Smart Chain', label: 'BINANCE SMART CHAIN' },
    { value: 'Fantom', label: 'FANTOM' },
    { value: 'Avalanche', label: 'AVALANCHE' },
  ];

  const [evm_address, setEvmAddress] = useState(address);
  const [selectedOption, setSelectedOption] = useState(options[0]);
  // The object holding emissions
  const [emissions, setEmissions] = useState({});
  const [signer, setSigner] = useState({});
  const [nftMetadata, setNftMetadata] = useState({});
  const [premineData, setPremineData] = useState({});
  // Treasury State
  const [treasuryData, setTreasuryData] = useState({
    "treasury_projects": [
    {
    "id": 0,
    "title": "Kariba REDD+ Project",
    "n_votes": 0,
    "location": "Zimbabwe",
    "description": "Prevents deforestation and wildlife extinction in northern Zimbabwe.",
    "color": "#1f77b4",
    "share_pct": "0"
    },
    {
    "id": 1,
    "title": "Kasigau Corridor REDD+ Project",
    "n_votes": 0,
    "location": "Kenya",
    "description": "Protects threatened forest habitats and wildlife in Kenya.",
    "color": "#ff7f0e",
    "share_pct": "0"
    },
    {
    "id": 2,
    "title": "Madre de Dios Amazon REDD",
    "n_votes": 0,
    "location": "Peru",
    "description": "Preserves the biodiversity of the Amazon rainforest in Peru.",
    "color": "#2ca02c",
    "share_pct": "0"
    },
    {
    "id": 3,
    "title": "Rimba Raya Biodiversity Reserve REDD",
    "n_votes": 0,
    "location": "Indonesia",
    "description": "Protects endangered species and their habitats in Borneo.",
    "color": "#d62728",
    "share_pct": "0"
    },
    {
    "id": 4,
    "title": "Alto Mayo Protected Forest REDD",
    "n_votes": 0,
    "location": "Peru",
    "description": "Conserves the biodiversity of the Alto Mayo Protected Forest.",
    "color": "#9467bd",
    "share_pct": "0"
    }
    ],
    "chainId": 297,
    "totalInvestment": 3000000000,
    "carbonOffseted": "15.789473684210526",
    "holders": [
    {
    "address": "0xaEF8BE5202C5DbB75A32D14C86C6a71cdBD7E5A7",
    "pending_votes": 1000000000,
    "investment": 1000000000
    },
    {
    "address": "0xa7a5c24eAA9EFF93E4A8eD72317906EA7a0305E8",
    "pending_votes": 2000000000,
    "investment": 2000000000
    }
    ]
  });
  const [votes, setVotes] = useState({
    '0': 0,
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    // Add more projects as needed
  });

  ///////////////////////////////////////////////////////////////////
  // HEDERA APIs AND FUNCTIONS
  // If we weren't able to grab it, we should throw a new error
  if (!process.env.REACT_APP_OPERATOR_ID || !process.env.REACT_APP_OPERATOR_PVKEY) {
    throw new Error("Environment variables REACT_APP_OPERATOR_ID and REACT_APP_OPERATOR_PVKEY must be present");
  }

  // create your client
  const operatorId = AccountId.fromString(process.env.REACT_APP_OPERATOR_ID);
  const operatorKey = PrivateKey.fromStringECDSA(process.env.REACT_APP_OPERATOR_PVKEY);
  const treasuryId = AccountId.fromString(process.env.REACT_APP_TREASURY_ID);
  const treasuryKey = PrivateKey.fromStringECDSA(process.env.REACT_APP_TREASURY_PVKEY);
  const aliceId = AccountId.fromString(process.env.REACT_APP_ALICE_ID);
  const aliceKey = PrivateKey.fromStringECDSA(process.env.REACT_APP_ALICE_PVKEY);
  const userClient = Client.forPreviewnet().setOperator(aliceId, aliceKey);
  const operatorClient = Client.forPreviewnet().setOperator(operatorId, operatorKey);

  const supplyKey = PrivateKey.generate();

  const sendHbar = async (client, fromAddress, toAddress, amount, operatorPrivateKey) => {
    console.log(`Sending ${amount} Hbar`)
    const transferHbarTransaction = new TransferTransaction()
      .addHbarTransfer(fromAddress, -amount)
      .addHbarTransfer(toAddress, amount)
      .freezeWith(client);
  
    const transferHbarTransactionSigned = await transferHbarTransaction.sign(operatorPrivateKey);
    const transferHbarTransactionResponse = await transferHbarTransactionSigned.execute(client);
  
    // Get the child receipt or child record to return the Hedera Account ID for the new account that was created
    const transactionReceipt = await new TransactionReceiptQuery()
      .setTransactionId(transferHbarTransactionResponse.transactionId)
      .setIncludeChildren(true)
      .execute(client);
  
    const childReceipt = transactionReceipt.children[0];
  
    if(!childReceipt || childReceipt.accountId === null) {
      console.warn(`No account id was found in child receipt. Child Receipt: ${JSON.stringify(childReceipt, null, 4)}`);
      return;
    }
  
     const newAccountId = childReceipt.accountId.toString();
     console.log(`Account ID of the newly created account: ${newAccountId}`);
  }

  async function createNFT() {
    const nftCreate = await new TokenCreateTransaction()
      .setTokenName("NetZeroNFT")
      .setTokenSymbol("NZT")
      .setTokenType(TokenType.NonFungibleUnique)
      .setDecimals(0)
      .setInitialSupply(0)
      .setTreasuryAccountId(treasuryId)
      .setSupplyKey(supplyKey)
      .freezeWith(operatorClient);
  
    const nftCreateTxSign = await nftCreate.sign(treasuryKey);
    const nftCreateSubmit = await nftCreateTxSign.execute(operatorClient);
    const nftCreateRx = await nftCreateSubmit.getReceipt(operatorClient);
    const tokenId = nftCreateRx.tokenId;
    console.log(`- Created NFT with Token ID: ${tokenId} \n`);
  
    return tokenId;
  }
  
  async function mintNFTs(tokenId, ownerAddress) {
    const maxTransactionFee = new Hbar(20);
    const CID = [
      Buffer.from(
        `${NFT_METADATA_URL}/${ shortenAddress(ownerAddress) }`
      ),
    ];
  
    const mintTx = new TokenMintTransaction()
      .setTokenId(tokenId)
      .setMetadata(CID)
      .setMaxTransactionFee(maxTransactionFee)
      .freezeWith(operatorClient);
  
    const mintTxSign = await mintTx.sign(supplyKey);
    const mintTxSubmit = await mintTxSign.execute(operatorClient);
    const mintRx = await mintTxSubmit.getReceipt(operatorClient);
  
    console.log(
      `- Created NFT ${tokenId} with serial: ${mintRx.serials[0].low} \n`
    );
  }
  
  async function associateAliceToNFT(tokenId) {
    const associateAliceTx = await new TokenAssociateTransaction()
      .setAccountId(aliceId)
      .setTokenIds([tokenId])
      .freezeWith(operatorClient)
      .sign(aliceKey);
  
    const associateAliceTxSubmit = await associateAliceTx.execute(operatorClient);
    const associateAliceRx = await associateAliceTxSubmit.getReceipt(operatorClient);
  
    console.log(
      `- NFT association with Alice's account: ${associateAliceRx.status}\n`
    );
  }
  
  async function transferNFT(tokenId) {
    const tokenTransferTx = await new TransferTransaction()
      .addNftTransfer(tokenId, 1, treasuryId, aliceId)
      .freezeWith(operatorClient)
      .sign(treasuryKey);
  
    const tokenTransferSubmit = await tokenTransferTx.execute(operatorClient);
    const tokenTransferRx = await tokenTransferSubmit.getReceipt(operatorClient);
  
    console.log(
      `\n- NFT transfer from Treasury to Alice: ${tokenTransferRx.status} \n`
    );
  }

  const createAndMintNft = async () => {
    const tokenId = await createNFT(); // NFT to be created only once
    console.log("NFT Token ID", tokenId);
    await mintNFTs(tokenId, address);
    await associateAliceToNFT(tokenId);
    await transferNFT(tokenId);
    return tokenId;
  }

  ///////////////////////////////////////////////////////////////////

  const handleChange = (event) => {
    setEvmAddress(event.target.value);
  };

  const handleVote = (projectID, delta) => {
    setVotes({
      ...votes,
      [projectID]: Math.max(votes[projectID] + delta, 0),
    });
  };

  const handleSubmit = async () => {
    // Make a call to the smart contract. We also need to do error handling here
    console.log(votes);
    setIsLoading(true);
    await voteForProjects(votes);
    await getAllTreasury(); // Fetch treasury once again
    setIsLoading(false);
    setHasVoted(true);
  };

  // A fancy function to shorten someones wallet address, no need to show the whole thing.
  const shortenAddress = (str) => {
    return str.substring(0, 10) + '...' + str.substring(str.length - 4);
  };

  function RenderAddress(address) {
    return <div className="badge"> <b> Connected Address: {shortenAddress(address)} </b></div>
  }

  const parseTinyBars = (tinybars) => {
    return ethers.utils.formatUnits(tinybars, 9)
  }

  // Function to calculate emissions for given wallet
  const handleEmissionsCalculation = async () => {
    console.log("Calculating emissions for address", evm_address);
    setIsLoading(true);
    const result = await calculateEmissions({
      address: evm_address ? evm_address: address,
      etherscanAPIKey: ETHERSCAN_API_KEY
    });
    setEmissionsCalculated(true);
    setEmissions(result);
    setIsLoading(false);
  };

  // Amount Investment and offsetting related functions
  const getPremineMetadata = async () => {
    const request = {
      method: 'POST',
      headers: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'http://localhost:3000',
      },
      body: JSON.stringify({
        ...emissions,
        address: shortenAddress(address),
        network: network?.[0].data.chain.id,
      }),
    };
    console.log("Request body", JSON.stringify(request));
    const response = await fetch(`${PREMINE_API_ENDPOINT}`, request);
    return response.json();
  };

  const getDynamicNFTMetadata = async (ownerAddress) => {
    const response = await fetch(`${NFT_METADATA_URL}/${shortenAddress(ownerAddress)}`);
    return response.json();
  };

  // Amount Investment and offsetting related functions
  const getTreasuryData = async () => {
    const params = {chainId: network?.[0].data.chain.id}
    TREASURY_API_ENDPOINT.search = new URLSearchParams(params).toString();
    const response = await fetch(TREASURY_API_ENDPOINT);
    return response.json();
  };

  const offsetEmissions = async () => {
    setIsLoading(true);
    setNFTMinted(false);

    const premineData = await getPremineMetadata();
    setPremineData(premineData)
    investHbar(premineData.hbarValue)
    setNftMetadata(await getDynamicNFTMetadata(address))
    const nftTokenId = await createAndMintNft()
    premineData['hashscan_url'] = `https://hashscan.io/previewnet/token/${nftTokenId}`
    setNFTMinted(true);
    setNFTViewed(false);
    setIsLoading(false);
  }

  async function investHbar(hbarValue) {
    const daoSigner = daoContract.connect(signer);
    const hbar = ethers.utils.parseEther(hbarValue.toString());
    const transaction = await daoSigner.invest({ value: hbar });
    const txn_receipt = await transaction.wait();
    console.log("Transaction receipt for HBAR investment - " + JSON.stringify(txn_receipt));
  }

  async function voteForProjects(bulkVotes) {
    const daoSigner = daoContract.connect(signer);
    const indices = Object.keys(bulkVotes).map(Number);
    const votes = Object.values(bulkVotes);
    // const hbar = ethers.utils.parseEther(hbarValue);
    const transaction = await daoSigner.bulkVote(indices, votes);
    const txn_receipt = await transaction.wait();
    console.log("Transaction receipt for vote call - " + JSON.stringify(txn_receipt));
  }

  async function navigateToDAO() {
    setNFTViewed(true);
    setIsLoading(true);
    await getAllTreasury();
    setIsLoading(false);
  }

  function handleOptionChange(event) {
    setSelectedOption(event.target.value);
  }

  const getAllTreasury = async () => {
    try {
      const treasuryData = await getTreasuryData();
      setTreasuryData(treasuryData);
      console.log('🚀 Treasury Data ', JSON.stringify(treasuryData));
    } catch (error) {
      console.error('failed to get treasury', error);
    }
  };

  // State management stuff
  const [hasVoted, setHasVoted] = useState(false);
  const [isEmissionsCalculated, setEmissionsCalculated] = useState(false);
  const [isNFTMinted, setNFTMinted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isNFTViewed, setNFTViewed] = useState(false);  

  useEffect(() => {
    if (!address) {
      return;
    }
    provider.send("eth_requestAccounts", []).then(() => setSigner(provider.getSigner()));
  }, [address]);


  // Check whether the user is on Hedera Network
  if (address && network?.[0].data.chain.id !== 297) {
    return (
      <div className="unsupported-network">
        <h2>Please connect to Hedera Previewnet</h2>
        <p>
          This dapp only works on the Hedera network as of now, please switch networks in
          your connected wallet.
        </p>
      </div>
    );
  }

  // This is the case where the user hasn't connected their wallet
  // to your web app. Let them call connectWallet.
  if (!address) {
    return (
      <div className="landing">
        <h1>NetZer🌍 DAO</h1>
        <h2> Connect your wallet to calculate your emissions </h2>
        <br></br>
        <div className="btn-hero">
          <ConnectWallet/>
        </div>
      </div>
    );
  }

  // calculate emissions after getting the address
  if (address && !isEmissionsCalculated) {
    return (
      <div className='landing'>
        <h1>NetZer🌍 DAO</h1>
        <h2>Calculate and offset your emissions of any chain via HBAR </h2>
        <br></br>
        {RenderAddress(address)}
        <div className="input-container">
          <label htmlFor="address-input" className="input-label">Enter address here</label>
            <input 
              type="text" 
              id="address-input" 
              className="address-input" 
              value={evm_address}
              onChange={handleChange}
              placeholder={address}
            />
        </div>
        <div style={{  display: 'flex', flexDirection: "row", alignItems: "center", alignContent: "center" }}>
        <div className="select-container">
          <select className="select-dropdown" value={selectedOption} onChange={handleOptionChange}>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <Button className='button-go'
            onClick={handleEmissionsCalculation}
            isLoading={isLoading}
            bg="blue.800"
            color="blue.300"
            fontSize="md"
            fontWeight="medium"
            borderRadius="xl"
            border="1px solid transparent"
            margin="10"
            _hover={{
              borderColor: "blue.700",
              color: "blue.400",
            }}
            _active={{
              backgroundColor: "blue.800",
              borderColor: "blue.700",
            }}
          >
            {isLoading ? <CircularProgress isIndeterminate size="24px" color="teal.500" /> : "  GO  "}
          </Button>
        </div>
        <div>
          <Button
            onClick={handleEmissionsCalculation}
            bg="blue.800"
            color="blue.300"
            fontSize="lg"
            fontWeight="medium"
            borderRadius="xl"
            border="1px solid transparent"
            _hover={{
              borderColor: "blue.700",
              color: "blue.400",
            }}
            _active={{
              backgroundColor: "blue.800",
              borderColor: "blue.700",
            }}
          >
           Calculate Emissions
          </Button>
        </div>
      </div>
    )
  }
  
  // Emissions are calculated and we need to display the values and allow users to offset
  if (isEmissionsCalculated && emissions && !isNFTViewed) {
    return !isNFTMinted ? (
      <div className="landing">
        <h1>Emissions Stats📊</h1>
        <br></br>
        {RenderAddress(address)}
        <br></br>
        <div >
          <br></br>
          <Box>
            {DisplayData(emissions)}
          </Box>
          <br></br>
          <Button
            onClick={offsetEmissions}
            isLoading={isLoading}
            bg="blue.800"
            color="blue.300"
            fontSize="lg"
            fontWeight="medium"
            borderRadius="xl"
            border="1px solid transparent"
            _hover={{
              borderColor: "blue.700",
              color: "blue.400",
            }}
            _active={{
              backgroundColor: "blue.800",
              borderColor: "blue.700",
            }}
          >
            {isLoading ? <CircularProgress isIndeterminate size="24px" color="teal.500" /> : "Offset Emissions"}
          </Button>
        </div>
      </div>
    ) :
       (
        <div className="landing">
          <h1>Congratulations!</h1>
          <h3> You are now a NetZer🌍 DAO Member. Thank you for investing in the planet. </h3>
          {RenderAddress(address)}
          <br></br>
          <div>
            {/* <h2> Here's your soulbound NFT!</h2> */}
            {MetadataDisplay(nftMetadata)}
            <Box>
              <a href={premineData.hashscan_url} target="_blank"> <h2> View on Hashscan </h2> </a>
            </Box>
            <br></br>
            <Button
              onClick={navigateToDAO}
              isLoading={isLoading}
              bg="blue.800"
              color="blue.300"
              fontSize="lg"
              fontWeight="medium"
              borderRadius="xl"
              border="1px solid transparent"
              _hover={{
                borderColor: "blue.700",
                color: "blue.400",
              }}
              _active={{
                backgroundColor: "blue.800",
                borderColor: "blue.700",
              }}
            >
              {isLoading ? <CircularProgress isIndeterminate size="24px" color="teal.500" /> : "NetZer🌍 DAO Dashboard"}
            </Button>
            <br></br>
            <br></br>
            <br></br>
          </div>
        </div>
      )
  }

  if (isNFTViewed && treasuryData) {
    return (
      <div className='member-page'>
        <h1>NetZer🌍 Dashboard</h1>
        <div className="member-card">
          <div className="flex-container">
            <div className="chart-container">
              <h2 style={{ textAlign: 'center' }}>Investment Distribution</h2>
              <br></br>
              <PieChart data={treasuryData.treasury_projects.map((project) => ({
                  id: project.id,
                  value: Number(project.share_pct),
                  color: project.color,
                }))}
                label={({ dataEntry }) => 'P' + dataEntry.id + '(' + dataEntry.value + '%)'}
                labelStyle={{ fontSize: '6px', fill: '#FFFFFF' }}
                style={{ height: '300px', margin: 'auto' }}/>
              <div className="badge"> <b> Treasury Fund - {parseTinyBars(treasuryData.totalInvestment)}HBAR </b></div>
              <br></br>
              <div className="badge"> <b> Net Carbon Sequestered - {treasuryData.carbonSequestered}tCO2e </b> </div>
              <br></br>
              <div className="badge"> <b> Total Potential - {treasuryData.carbonOffsetPotential}tCO2e </b> </div>
              <br></br>
              <div>
                <h3>Member List</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Address</th>
                        <th>Pending Votes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {treasuryData.holders.map((member) => {
                        return (
                          <tr key={member.address}>
                            <td>{shortenAddress(member.address)}</td>
                            <td>{parseTinyBars(member.pending_votes)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
              </div>
            </div>

            <div className="voting-container">
              <h2 style={{ textAlign: 'center' }}>Active Projects</h2>
              {treasuryData.treasury_projects.map((project) => (
                <div key={project.title} className="project">
                  <h2 className="project-title">{project.id}. {project.title}</h2>
                  <p className="project-description">{project.description}</p>
                  <br></br>
                  <div>
                    <button onClick={() => handleVote(project.id, -5)} className="vote-button">-</button>
                    <span className="vote-count">{votes[project.id]}</span>
                    <button onClick={() => handleVote(project.id, 5)} className="vote-button">+</button>
                  </div>
                </div>
              ))} 
              {
                hasVoted && !isLoading? (
                  <div className="submit-success">Your votes has been submitted!</div>
                ) : (
                  <Button onClick={handleSubmit} isLoading={isLoading} className="button-go">
                    {isLoading ? <CircularProgress isIndeterminate size="24px" color="teal.500" /> : "  SUBMIT VOTES  "}
                  </Button>
                )
              }
              <br></br>
              <br></br>
              <br></br>
              
            </div>
          </div>
        </div>
      </div>
    );
  }

  function DisplayData(data) {
    return (
      <Flex>
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>kgCO2 </td>
              <td>{data.kgCO2}</td>
            </tr>
            <tr>
              <td>transactions Count </td>
              <td>{data.transactionsCount}</td>
            </tr>
            <tr>
              <td>Gas Used </td>
              <td>{data.gasUsed}</td>
            </tr>
            <tr>
              <td>Highest Block Number </td>
              <td>{data.highestBlockNumber}</td>
            </tr>
            <tr>
              <td >Lowest Block Number</td>
              <td>{data.lowestBlockNumber}</td>
            </tr>
          </tbody>
        </table>
      </Flex>
    );
  }

  function MetadataDisplay(metadata) {
      return (
          <div className="metadata-card">
              <img className="metadata-image" src={metadata.image} alt={metadata.name} />
              <div className="metadata-content">
                  <h2 className="metadata-title">{metadata.name}</h2>
                  <p className="metadata-description">{metadata.description}</p>
                  <ul className="metadata-attributes">
                      {metadata.attributes.map((attribute, index) => (
                          <li key={index} className="metadata-attribute">
                              <strong>{attribute.trait_type}</strong> {attribute.value}
                          </li>
                      ))}
                  </ul>
              </div>
          </div>
      );
  }

};

export default App;
