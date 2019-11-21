/*-
 * Copyright (c) 2019 @secondphonejune
 * All rights reserved.
 *
 * This code is derived by @secondphonejune (Telegram ID)
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE NETBSD FOUNDATION, INC. AND CONTRIBUTORS
 * ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
 * TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE FOUNDATION OR CONTRIBUTORS
 * BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 * This project is originally created to implement an election for 2019 Hong Kong local elections.
 * Ofcause the Hong Kong government is not going to use it, but we have a chance to show that how an election can be done completely anonymously with blockchain
 * Everyone can use the code provided in this project, but they must keep this statement here unchanged.
 * Fight for freedom, Stand with Hong Kong
 * Five Demands, Not One Less
 */

var express = require('express');
var app = express();
var path = require("path");
app.use(express.static('public-html'));
var cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use(express.json());
var nodemailer = require('nodemailer');
var credentials = require('./credentials');
var session = require('express-session');
app.use(session({
	secret: '2019blockchainlocalelection',
	resave: true,
	saveUninitialized: false
}));
var Web3 = require('web3');
web3 = new Web3(new Web3.providers.HttpProvider(credentials.infuraEndPoint));
var EthereumTx = require('ethereumjs-tx').Transaction
var privateKey = Buffer.from(credentials.privateKey,'hex');

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname + '/public-html/index.html'));
});
app.post('/sendEmailCode',function (req, res) {
	var nonce = req.header('xsrfsendEmailCode');
	var nonce2 = req.cookies['xsrfsendEmailCode'];
	if(nonce.length <3 || nonce != nonce2){
		res.send('{"error":true,"msg":"Invalid request. Potential CSRF"}');
		return;
	}
	var email = req.body.email;
	if(email.length <3 || !validateEmail(email)){
		res.send('{"error":true,"msg":"Invalid email."}');
		return;
	}
	var emailVerCode = Math.floor((Math.random() * 90000000) + 10000000);
	req.session.email = email;
	req.session.emailCode = emailVerCode;
	sendEmailCode(email,emailVerCode).catch(console.error);
	res.send('{"success":true,"result":"Success"}');
});
app.post('/uploadVote',function (req, res) {
	var nonce = req.header('xsrfuploadVoteCode');
	var nonce2 = req.cookies['xsrfuploadVoteCode'];
	if(nonce.length <3 || nonce != nonce2){
		res.send('{"error":true,"msg":"Invalid request. Potential CSRF"}');
		return;
	}
	var voterID = req.body.voterID;
	var emailCode = req.body.emailCode;
	var council = req.body.council;
	var encryptedVote = req.body.encryptedVote;
	var hashedEmail = req.body.hashedEmail;
	//Assume 512 bit RSA encryption key
	if(!voterID || voterID.length <3 || !emailCode || emailCode.length <3 
		|| !council || council.length <2 
		|| !encryptedVote || encryptedVote.length <3 || encryptedVote.length > 105
		|| !hashedEmail || hashedEmail.length <3){
		res.send('{"error":true,"msg":"Invalid input."}');
		return;
	}
	if(!req.session.emailCode || parseInt(emailCode) != req.session.emailCode 
		|| !req.session.email){
		res.send('{"error":true,"msg":"Wrong email code or the code is expired. Please send again."}');
		return;
	}
	//TODO: Check if the voter has registered or voted before, return error if there is problem.
	//As I have no time to study how to do it in Node.js. This part is skipped.
	
	//Sign the transaction and upload the vote to blockchain
	web3.eth.call({
		to:credentials.electionSmartcontractAddress,
		data:"0x01cf6cd7"
	}).then(function(isRunningElection){
		var isRunning = parseInt(isRunningElection, 16);
		if(isRunning <1){
			res.send('{"error":true,"msg":"The election is not running."}');
		}
		web3.eth.getTransactionCount(credentials.senderAddress).then(function(txnCount){
			var data ="0xfc1372d5";
			data = appendIntToData(data,voterID);
			data = appendIntToData(data,hashedEmail);
			data += "0000000000000000000000000000000000000000000000000000000000000080";
			data += "00000000000000000000000000000000000000000000000000000000000000c0";
			data = appendTextToData(data,council);
			data = appendTextToData(data,encryptedVote);			
			//1.2 Gwei, gas limit 450,000
			var txData = {
				nonce: web3.utils.toHex(txnCount),
				gasLimit: web3.utils.toHex(450000),
				gasPrice: web3.utils.toHex(12e8),
				to: credentials.electionSmartcontractAddress,
				value: '0x00',
				data: data
			}			
			var tx = new EthereumTx(txData);
			tx.sign(privateKey);
			var serializedTx = tx.serialize();			
			//web3.eth.sendRawTransaction(serializedTx.toString('hex'), function(err, hash) {
			web3.eth.sendSignedTransaction('0x'+serializedTx.toString('hex'), function(err, hash) {
				if (!err){
					res.send('{"success":true,"result":"Success","msg":"'+hash+'"}');
				}else{
					res.send('{"error":true,"msg":"Cannot publish to blockchain '+err+'."}');
					console.log(err);
				}
			}).on('error', function(err){
				res.send('{"error":true,"msg":"Cannot publish to blockchain '+err+'."}');
				console.log(err);
			});
		});
	});
	
	/*var txCount = web3.eth.getTransactionCount(addressFrom);
	// construct the transaction data
	

	  // fire away!
	  sendSigned(txData, function(err, result) {
		if (err) return console.log('error', err)
		console.log('sent', result)
	  })*/
	//res.send('{"success":true,"result":"Success","msg":'+isRunningElection.toString()+'}');
});



app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});


function validateEmail(email) {
    var re = /^\S+@\S+\.\S+$/;
    return re.test(email);
}
async function sendEmailCode(email,emailVerCode){
	var transporter = nodemailer.createTransport({
        host: credentials.email.host,
        port: credentials.email.port,
        secure: credentials.email.secure,
        auth: {
            user: credentials.email.user,
            pass: credentials.email.password
        }
    });
	var info = await transporter.sendMail({
        from: credentials.email.user, // sender address
        to: email, // list of receivers
        subject: 'Email verification code for Folk Hong Kong 2019 District Council Election', // Subject line
        text: 'Dear sir or madam,\n\nThank you for using our service. Your code is '
			+emailVerCode+'\nPlease copy this code into the verification code field when encrypt and submit the vote.\n\nFolk Hong Kong 2019 District Council Election',
        html: '<p>Dear sir or madam,</p><p>Thank you for using our service. Your code is '
			+emailVerCode+'<br>Please copy this code into the verification code field when encrypt and submit the vote.</p>Folk Hong Kong 2019 District Council Election'
    });
	console.log('Message sent: %s', info.messageId);
}
function encode_utf8(s){
	var s = unescape(encodeURIComponent(s))
	var h = ''
	for (var i = 0; i < s.length; i++) {
		h += s.charCodeAt(i).toString(16)
	}
	return h;
}
function appendIntToData(data,bn){
	var hexVal = bnToHex(bn).toLowerCase();
	while(hexVal.length<64){
		hexVal = hexVal+"0";
	}
	data += hexVal;
	return data;
}
function appendTextToData(data,txt){
	var encodedText = encode_utf8(txt);
	var textLength = encodedText.length/2;
	textLength = textLength.toString(16).toLowerCase(); //Make it text
	while(textLength.length<64){
		textLength = "0"+textLength;
	}
	data += textLength;
	//Append until fit 64 bytes
	while(encodedText.length %64 !=0){
		encodedText = encodedText+"0";
	}
	data += encodedText;
	return data;
}
function bnToHex(bn) {
  bn = BigInt(bn);
  var hex = bn.toString(16);
  if (hex.length % 2) { hex = '0' + hex; }
  return hex;
}
function hexToBn(hex) {
  if(hex.startsWith("0x")) hex = hex.substring(2);
  if (hex.length % 2) {
	hex = '0' + hex;
  }
  var bn = BigInt('0x' + hex);
  return bn;
}