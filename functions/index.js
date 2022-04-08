const functions = require("firebase-functions");
const admin = require('firebase-admin');
const axios = require('axios');
const corsOptions = {
  origin: 'http://localhost:3000',
  optionsSuccessStatus: 200 // For legacy browser support
}
const cors = require('cors')({origin: true});
admin.initializeApp();
// Add Your Key Here!!!
axios.defaults.headers.common = {
  "X-API-Key": "3lVg3xuiaKjf9iqUGWDn7T4Q85PZ2HbOn3zFGjJypjW73kiqVMngluk4thJb3qfp",
};

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

exports.helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});


exports.isWhiteListed = functions.https.onRequest( async (request, response) => {
  cors(req, res, async () => {
    const { address } = req.query
    res.set('Access-Control-Allow-Origin', '*');
    //const whitelistaddress = await admin.firestore().collection("whitelist")
    const wl = admin.firestore().collection('whitelist').doc('addresses');
    const doc = await wl.get();
    console.log(doc.exists)
    if (!doc.exists) {
      console.log('No such document!');
      res.send({isWhiteListed: false});
    } else {
      console.log("adfadsfads======")
      const { addresses } = doc.data();
      if(addresses.includes(address)){
        res.send({isWhiteListed: true});
      }else{
        res.send({isWhiteListed: false});
      }
    }
  })
  
});

exports.setWhitelist = functions.https.onRequest( async (request, response) => {
  const { address, access_token } = request.query;
  console.log({access_token})
  if(access_token !== ",GM7P8;aXP//gc7<"){
    response.send("Unauthorized");
  }
  const data = {
    addresses: whitelistaddresses,
  };
  // Add a new document in collection "cities" with ID 'LA'
  const res = await admin.firestore().collection('whitelist').doc('addresses').set(data);
  response.send(res);
});

exports.addToWhitelist = functions.https.onRequest( async (request, response) => {
  const { address, access_token } = request.query;
  if(access_token !== ",GM7P8;aXP//gc7<"){
    response.send("Unauthorized");
  }

  // get all the whitelist
  const wl = admin.firestore().collection('whitelist').doc('addresses');
  const doc = await wl.get();
  const { addresses } = doc.data();
  const data = {
    addresses: [...addresses, address],
  };
  // Add a new document in collection "cities" with ID 'LA'
  const res = await admin.firestore().collection('whitelist').doc('addresses').set(data);
  response.send(res);
});

exports.addToWhitelistArray = functions.https.onRequest( async (request, response) => {
  const { access_token } = request.query;
  const { addresses_list } = request.body;
  if(access_token !== ",GM7P8;aXP//gc7<"){
    response.send("Unauthorized");
  }

  // get all the whitelist
  const wl = admin.firestore().collection('whitelist').doc('addresses');
  const doc = await wl.get();
  const { addresses } = doc.data();
  const data = {
    addresses: addresses.concat(addresses_list),
  };
  // Add a new document in collection "cities" with ID 'LA'
  const res = await admin.firestore().collection('whitelist').doc('addresses').set(data);
  response.send(res);
});

const isTokenMinted = async (tokenId) => {
  const url = `https://deep-index.moralis.io/api/v2/nft/0xc27f71daE7Ff72171cAb048c7a483eFef930807D/${tokenId}?chain=eth&format=decimal`;
  const config = {
    headers: {
      "Content-Type": "application/json",
    },
  };
  try{
    const smsD = await axios({
      method: "get",
      url: url,
      config,
    });
    console.log("tokenminted")
    return true
  }catch(e){
    console.log("token unminted")
    return false
  }
}

exports.metadata = functions.https.onRequest( async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  const fileName = request.url.substring(1);
  const bucket = admin.storage().bucket("gs://youngbullclub.appspot.com")
  
  let stream = bucket.file(`meta/${fileName}`).createReadStream();
  let buf = '';
  const tokenMinted = await isTokenMinted(fileName.split(".")[0]);
  console.log({tokenMinted})
  if(!tokenMinted){
    stream = bucket.file(`meta/hidden.json`).createReadStream();
  }

  stream.on('data', function(d) {
    buf += d;
  }).on('end', function() {
    response.setHeader('Content-Type', 'application/json');
    response.send(buf);
  });    
});

exports.layers = functions.https.onRequest( async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  const { type, name } = request.query;
  console.log({name})
  const bucket = admin.storage().bucket("gs://youngbullclub.appspot.com")
  const [files] = await bucket.getFiles({ directory: `layers/${type}` })
  const fileNames = files.map( file => file.name)
  console.log({fileNames})
  const fileName = fileNames.filter( fileName =>  fileName.toLocaleLowerCase().includes(name.toLocaleLowerCase()))[0]

  const stream = bucket.file(fileName).createReadStream();
  response.setHeader("content-type", "image/png");
  stream.pipe(response);
   
});

exports.images = functions.https.onRequest( async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  const fileName = request.url.substring(1);
  const bucket = admin.storage().bucket("gs://youngbullclub.appspot.com")

  const tokenMinted = await isTokenMinted(fileName.split(".")[0]);
  if(!tokenMinted){
    response.send({error: "This Young Bull has not been minted yet."})
  }else{
    const stream = bucket.file(`images/${fileName}`).createReadStream();
    response.setHeader("content-type", "image/jpeg");
    stream.pipe(response);
  }  
});

const isBullHolder = async address => {
  const url = `https://deep-index.moralis.io/api/v2/nft/0xc27f71daE7Ff72171cAb048c7a483eFef930807D/owners?chain=eth&format=decimal`;
  const config = {
    headers: {
      "Content-Type": "application/json",
    },
  };
  try{
    const { data } = await axios({
      method: "get",
      url: url,
      config,
    });
    const addresses = data.result.map( address => address.owner_of)
    if(addresses.includes(address)){
      return true
    }
    return false
  }catch(e){
    console.log("token unminted")
    return false
  }
}

exports.getCurrentMinted = functions.https.onRequest( async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  const url = `https://deep-index.moralis.io/api/v2/nft/0xc27f71daE7Ff72171cAb048c7a483eFef930807D?chain=eth&format=decimal`;
  const config = {
    headers: {
      "Content-Type": "application/json",
    },
  };
  try{
    const { data } = await axios({
      method: "get",
      url: url,
      config,
    });
    response.send(data.total)
    
  }catch(e){
  }
});
  
exports.createdReferalCode = functions.https.onRequest( async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  const { address } = request.query;
  const truncated = address.split("").filter((i, ndx) => ndx%10 === 0).join("")
  let code;
  
  // Check if this user 
  const bullHolder = await isBullHolder(address.toLocaleLowerCase());
  if(bullHolder){
    // The referall code starts with a CL
    code = `CL${truncated}`
    // get current doc
    const cl = admin.firestore().collection('clearlist').doc('addresses');
    const cldoc = await cl.get();
    
    const clearlistAddresses = cldoc.data();
    clearlistAddresses[address] = {
      code,
      count: 0
    }
    await admin.firestore().collection('clearlist').doc('addresses').set(clearlistAddresses);
  }else{
    code = `WL${truncated}`
    const wl = admin.firestore().collection('whitelistNew').doc('addresses');
    const cldoc = await wl.get();
    
    const whitelistAddress = cldoc.data();
    whitelistAddress[address] = {
      code,
      count: 0
    }
    await admin.firestore().collection('whitelistNew').doc('addresses').set(whitelistAddress);
  }

  response.send({ code, count: 0})
});


exports.getReferalCode = functions.https.onRequest( async (request, response) => {  
  response.set('Access-Control-Allow-Origin', '*');
    const { address } = request.query;

    // Get all clear list referall codes
    const cl = admin.firestore().collection('clearlist').doc('addresses');
    const cldoc = await cl.get();
    const clearlistAddresses = cldoc.data();

    // Get all white list referall codes
    const wl = admin.firestore().collection('whitelistNew').doc('addresses');
    const wldoc = await wl.get();
    const whitelistAddresses = wldoc.data();

    // check if this user is in the new whitelist
    console.log(whitelistAddresses)
    if( address in whitelistAddresses){
      response.send(whitelistAddresses[address])
    }else if(clearlistAddresses.hasOwnProperty(address)){
      response.send(clearlistAddresses[address])
    }
    else{
      response.send({code: null})
    }
});


exports.updateCodeCount = functions.https.onRequest( async (request, response) => {  
  response.set('Access-Control-Allow-Origin', '*');
  const { code, count } = request.query;

  // If this is a wl code
  if(code.includes("WL")){
    // This is a white code, get wl
    const wl = admin.firestore().collection('whitelistNew').doc('addresses');
    const cldoc = await wl.get();
    
    const whitelistAddress = cldoc.data();
    const keys = Object.keys(whitelistAddress);
    // Find the address by code
    const address = keys.filter(key => whitelistAddress[key].code === code)[0]
    if( address.length === 0){
      // this code was not found
      response.send({error: "code not found"})
    }
    
    whitelistAddress[address] = {
      code,
      count: Number(whitelistAddress[address].count) + Number(count)
    }
    await admin.firestore().collection('whitelistNew').doc('addresses').set(whitelistAddress);
    response.send({success: true})
  }else{
    // This is a clearlist
    const cl = admin.firestore().collection('clearlist').doc('addresses');
    const cldoc = await cl.get();
    
    const clearlistAddresses = cldoc.data();
    const keys = Object.keys(clearlistAddresses);
    // Find the address by code
    const address = keys.filter(key => clearlistAddresses[key].code === code)[0]
    if( address.length === 0){
      // this code was not found
      response.send({error: "code not found"})
    }
    console.log(address)
    clearlistAddresses[address] = {
      code,
      count: Number(clearlistAddresses[address].count) + Number(count)
    }
    await admin.firestore().collection('clearlist').doc('addresses').set(clearlistAddresses);
    response.send({success: true})
  }
});

const nftData = async address => {
  const url = `https://deep-index.moralis.io/api/v2/${address}/nft/0xc27f71daE7Ff72171cAb048c7a483eFef930807D?chain=eth&format=decimal`;
  const config = {
    headers: {
      "Content-Type": "application/json",
    },
  };
  try{
    const { data } = await axios({
      method: "get",
      url: url,
      config,
    });

    return data
  }catch(e){
    return false
  }
}

exports.nftData = functions.https.onRequest( async (request, response) => {  
  response.set('Access-Control-Allow-Origin', '*');
  const { address } = request.query;
  const data = await nftData(address)
  response.send(data)

})


