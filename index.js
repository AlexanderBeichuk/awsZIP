const AWS = require('aws-sdk');
const s3Zip = require('s3-zip');
const fs = require('fs');
const join = require('path').join;

const s3 = new AWS.S3();

exports.handler = function (event, context, callback) {

    const regex = /(?:\/\/s3\.amazonaws.com\/([^\/]+)|:\/\/([^.]+)\.s3\.amazonaws\.com)\/([^\/]+)/;
    let files = [];
    const region = `us-east-1`;
    const zip = {
        bucket: `fuseplm-attachments`,
        folder: `zip/`,
        folderTemporary: `${Math.floor(Math.random() * Math.floor(10000000))}/`,
        fileName: event.zipfilename
    };
    const promises = [];
    event.data.forEach(item => {
        const copyFilePromise = new Promise((resolve, reject) => {
            const urlComponents = item.split(regex);
            const separateIndex = urlComponents[4].lastIndexOf('/');
            const bucket = urlComponents[2];
            const folder = `${urlComponents[3]}${urlComponents[4].slice(0, separateIndex)}/`;
            const urlName = item.split('/');
            const fileName = urlName[urlName.length - 1];
            s3.copyObject({
                CopySource: `${bucket}/${folder + fileName}`,
                Bucket: zip.bucket,
                Key: zip.folderTemporary + fileName,
                ACL: 'public-read'
            }, (errorCopy, successCopy) => {
                if (errorCopy) {
                    console.log('errorCopy');
                    console.log(errorCopy);
                    reject(errorCopy);
                }
                resolve(fileName);
            })
        });
        promises.push(copyFilePromise);
    });

    try {
        Promise
            .all(promises)
            .then(response => {
                zipping(region, zip, response, callback);
            })
            .catch(error => {
                callback(error);
            });

    } catch (catchedError) {
        console.log(`Catched error: ${catchedError}`);
        callback(catchedError);
    }
};

function zipping(region, zip, files, callback) {
    const body = s3Zip.archive({
        region: region,
        bucket: zip.bucket
    }, zip.folderTemporary, files);

    new AWS.S3({
        params: {
            Bucket: zip.bucket,
            Key: zip.folder + zip.fileName,
            ACL: 'public-read'
        }
    }).upload({
            Body: body
        })
        .send((errorUpload, successUpload) => {
            if (errorUpload) {
                console.log(`ZIPFILE UPLOAD ERROR ${errorUpload}`);
                //callback(errorUpload);
            }
            s3.headObject({
                Bucket: zip.bucket,
                Key: zip.folder + zip.fileName
            }, (errorFileInfo, headObjectData) => {
                if (errorFileInfo) {
                    console.log(errorFileInfo);
                    callback(errorFileInfo);
                }
                files.forEach(file => {
                    s3.deleteObject({
                        Bucket: zip.bucket,
                        Key: zip.folderTemporary + file
                    }, (errorDelete, successDelete) => {
                        if (errorDelete) {
                            callback(errorDelete);
                        }
                    });
                });
                const fileSize = bytesToSize(headObjectData.ContentLength);
                if ((fileSize.amount > 500 && fileSize.unitIndex === 2) || fileSize.unitIndex > 2) {
                    console.log(`Limit exceeded: ${fileSize.amount} ${fileSize.unit}`);
                    callback({
                        message: `Limit exceeded`,
                        size: `${fileSize.amount} ${fileSize.unit}`
                    });
                }
                const responseURL = `https://s3-us-west-1.amazonaws.com/${zip.bucket}/${zip.folder + zip.fileName}`;
                callback(null, responseURL);
            });
        })
}

function bytesToSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) {
        return {
            amount: 0,
            unitIndex: 0,
            unit: sizes[0]
        };
    }
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return {
        amount: Math.round(bytes / Math.pow(1024, i), 2),
        unitIndex: i,
        unit: sizes[i]
    }
};