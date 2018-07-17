/**
 * Created by user on 11.07.2018. //PR
 */

var AWS = require('aws-sdk');
var s3Zip = require('s3-zip');

exports.handler = function (event, context) {
  console.log('event', event);

  var region = 'REGION';
  var bucket = 'BUCKET';
  var folder = 'FOLDER';
  var files = 'FILES';
  var zipFileName = 'FILENAME';

  try {

    var body = s3Zip.archive({ region: region, bucket: bucket}, folder, files);
    var zipParams = { params: { Bucket: bucket, Key: folder + zipFileName } };
    var zipFile = new AWS.S3(zipParams);
    zipFile.upload({ Body: body })
      .on('httpUploadProgress', function (evt) { console.log(evt) })
      .send(function (e, r) {
        if (e) {
          var err = 'zipFile.upload error ' + e;
          console.log(err);
          context.fail(err)
        }
        console.log(r);
        context.succeed(r)
      })

  } catch (e) {
    var err = 'catched error: ' + e;
    console.log(err);
    context.fail(err)
  }

  callback(null, zipFile)
};