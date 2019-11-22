# hk2019distractelectionblockchain
Since June 2019, Hong Kong people has started Anti-Extradition Law Amendment Bill Movement to protect their own freedom and rights. Hong Kong will have a District Council Election on 24 Nov 2019. It is a great oppotunity for people to express their view to district council and government. However, there are concerns that Hong Kong government will pause or cancel the election in order to protect the interest of pro-government parties. That's why we have started this project, a folk election based on smart contracts on the Ethereum network. It is to make sure the Hong Kong people, especially the young people who are familiar with the Internet, can express their views to the public All program codes and executions will be done in a open and transparent way. And the result will be as fair and just as possible.

In this project, nodejs keeps all files to be used in the web server, smartcontract keeps the smart contract files.

More details can be found in nodejs/public-html/blockchain_election_details.pdf

If you would like to help:
1) Join the voting and give feedback
2) Promote this project to everyone
3) (Most Important) Become one of the votebox
4) Help extending the election to cover all councils (smartcontract/electionList_smartcontract_V1.sol and nodejs/public-html/councils.json)
5) Help building the website (need someone to rebuild the website with design) and push to this github
6) Donate if you have ETH (We need 100 ETH in total for handling 200K votes, extra ETH will send to 星火, if they accept ETH)
You may check our current balance here: https://etherscan.io/address/0x0fe7c97d52d49a6249ac4ffab6e8e700b1c7e22d

TODO list:
1) one-pager for getting and decrypting the result
2) replace the vote encryption key pair (RSA 512bit) to something more secure, while keeping the encrypted message size small
(We use RSA 512bit because the output vote size is smallest, which means least cost on submitting to blockchain, and still secure for one day)
3) Find out a way to authenticate a person online in an automatical way.
