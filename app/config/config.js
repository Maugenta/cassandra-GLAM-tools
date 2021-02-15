const { Pool } = require('pg');
const AWS = require("aws-sdk");
const fs = require('fs');
const SQL = require('@nearform/sql');
const config = JSON.parse(fs.readFileSync(`${__dirname}/config.${process.env.ENV}.json`));

AWS.config = {
  ...AWS.config,
  ...config.aws.config
};

const sqs = new AWS.SQS();

function sendNewGlamMessage(glam) {
  return sqs.sendMessage({
    QueueUrl: config.aws.newGlamQueueUrl,
    MessageBody: JSON.stringify(glam),
  }).promise()
}

config.glamUser.realm = 'User area';
const glamUser = config.glamUser;
glamUser.users.push(config.admin);
config.admin.realm = 'Admin area';

const cassandraPgPool = new Pool(config.postgres);

const glams = {};

async function loadGlams() {
  const query = `SELECT * FROM glams`;
  const result = await cassandraPgPool.query(query)
  result.rows.forEach(element => {
    const glam = {
      name: element.name,
      fullname: element.fullname,
      category: element.category,
      image: element.image,
      website: element.website,
      connection: new Pool({
        ...config.postgres,
        database: element.database
      })
    };

    if (element.lastrun) {
      glam.lastrun = element.lastrun;
    } else {
      glam.lastrun = null;
    }

    if (element.status) {
      glam.status = element.status;
    } else {
      glam.status = null;
    }

    if (element['http-auth']) {
      glam['http-auth'] = element['http-auth'];
      glam['http-auth'].realm = element.name + " stats";
    }

    // Glams are never deleted
    glams[glam.name] = glam;
  })
  return glams;
}

async function insertGlam(glam) {
  const { name, fullname, category, image, database, website } = glam;
  const query = SQL`INSERT INTO glams (name, fullname, category, image, database, status, website) 
                    VALUES (${name}, ${fullname}, ${category}, ${image}, ${database}, 'pending', ${website || null})`;
  await cassandraPgPool.query(query)
  await sendNewGlamMessage({ name, fullname, category, image, database });
  console.log(`Created new GLAM "${name}"`);
}

function updateGlam(glam) {
  const { name, fullname, image, website } = glam;
  const query = SQL`
    UPDATE glams 
    SET fullname = ${fullname}, 
        image = ${image}, 
        website = ${website}, 
        updated_at = NOW() 
    WHERE name = ${name} 
  `;
  return cassandraPgPool.query(query);
}

module.exports = {
  ...config,
  glamUser,
  glams,
  loadGlams,
  insertGlam,
  updateGlam,
  cassandraPgPool
}