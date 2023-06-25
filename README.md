# NetZero DAO (by team HoraFeliz)

> Offset on-chain emissions using HBAR (the native Hedera currency) and invest transparently in on-ground carbon projects

![image](https://github.com/gautamp8/netzero-dao/assets/10217535/5a35d336-f33e-40d0-b4b1-7a4e75fc1e02)


## Try it out

See the project explanation video at: https://youtu.be/av83zaqHCIc

[![NetZero Demo](https://img.youtube.com/vi/av83zaqHCIc/1.jpg)](https://www.youtube.com/watch?v=av83zaqHCIc)


Check the deployed app at https://netzero-dao.vercel.app/. Please note -

- App currently supports ECDSA accounts only for EVM compatibility
- Switch to Hedera PreviewNet in your wallet before connecting. You can use this [Chainlist link](https://chainlist.org/?search=hedera+previewnet) to switch in one-click.
- If you do not have Ethereum mainnet transactions, you can pick any other wallet address to add to the box (For ex - `0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045` - vitalik.eth)

Please note that Hedera previewnet or testnet RPCs are relatively unstable nowadays. If connecting to them doesn't work, please try again at a different time when network load is low.


## About the code

This repo contains the Front-end for the project. The backend code is submoduled (can be accessed from the repo, or directly [here](https://github.com/satwikkansal/netzero-backend)).

### Architecture

Here's what the current architecture looks like

![image](/images/architecture.svg)

## Instructions to run

To get started with this project, clone this repo and follow the commands below

### Frontend

#### One-time setup

- Create a `.env` file referring to the sample `.env.example` file. Since this is a demo project we're putting keypair info in the `.env` of the frontend source. **Please DON'T put your mainnet keys in .env, this can lead to loss of real funds.** For production use, it is recommended to mint NFTs either at the backend or from the DAO contract (better).
- Run `npm install` at the root of your directory to install the dependencies. It is recommended you use node v18 or higher.

#### Recurring Instructions

After the one-time setup is done, just run `npm start` to start the project!

<img width="1492" alt="image" src="https://github.com/gautamp8/netzero-dao/assets/10217535/74bac331-eae1-4444-8068-5eb697bd7b19">


PS: This is our submission for Beyond Blockchain: Hashgraph Hackathon, we intend to take this project further post-hackathon.
