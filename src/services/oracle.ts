import * as common from 'oci-common';
import * as objectStorage from 'oci-objectstorage';
import * as mediaServices from 'oci-mediaservices';
import getSecret from '@helpers/fetchAWSSecret';

const fetch = require('node-fetch');

const mediaFlowsConfigs = [
  {
    displayName: `edugram-lecture-subtitles-generator`,
    freeformTags: {
      type: 'transcribe',
    },
    tasks: [
      {
        type: 'getFiles',
        version: 1,
        key: 'getFiles',
        prerequisites: [],
        parameters: {
          taskParameters: [
            {
              // eslint-disable-next-line no-template-curly-in-string
              target: '${/input/objectName}',
              // eslint-disable-next-line no-template-curly-in-string
              namespaceName: '${/input/namespaceName}',
              // eslint-disable-next-line no-template-curly-in-string
              bucketName: '${/input/bucketName}',
              // eslint-disable-next-line no-template-curly-in-string
              objectName: '${/input/objectName}',
            },
          ],
        },
      },
      {
        type: 'transcribe',
        version: 1,
        key: 'transcribe',
        prerequisites: ['getFiles'],
        enableParameterReference: null,
        enableWhenReferencedParameterEquals: null,
        parameters: {
          // eslint-disable-next-line no-template-curly-in-string
          inputVideo: '${/getFiles/taskParameters/0/target}',
          // eslint-disable-next-line no-template-curly-in-string
          outputAudio: '${/output/basePrefix}transcribe.wav',
          // eslint-disable-next-line no-template-curly-in-string
          outputTranscription: '${/output/basePrefix}',
          // eslint-disable-next-line no-template-curly-in-string
          // outputTranscriptionPrefix: '${/output/basePrefix}',
          // eslint-disable-next-line no-template-curly-in-string
          outputNamespaceName: '${/output/namespaceName}',
          // eslint-disable-next-line no-template-curly-in-string
          outputBucketName: '${/output/bucketName}',
          // eslint-disable-next-line no-template-curly-in-string
          transcriptionJobCompartment: '${/output/assetCompartmentId}',
          waitForCompletion: false,
          language: 'en',
        },
      },
      {
        type: 'putFiles',
        version: 1,
        key: 'putFiles',
        prerequisites: ['transcribe'],
        enableParameterReference: null,
        enableWhenReferencedParameterEquals: null,
        parameters: {
          taskParameters: [
            {
              // eslint-disable-next-line no-template-curly-in-string
              namespaceName: '${/output/namespaceName}',
              // eslint-disable-next-line no-template-curly-in-string
              bucketName: '${/output/bucketName}',
              // eslint-disable-next-line no-template-curly-in-string
              source: '*.json',
              // eslint-disable-next-line no-template-curly-in-string
              objectName: '${/output/basePrefix}${/output/objectNameFilename}',
              // eslint-disable-next-line no-template-curly-in-string
              assetCompartmentId: '${/output/assetCompartmentId}',
              registerMetadata: true,
            },
          ],
        },
      },
    ],
  },
  {
    displayName: `edugram-lecture-converter-360`,
    freeformTags: {
      resolution: '360',
      type: 'transcode',
    },
    tasks: [
      {
        type: 'getFiles',
        version: 1,
        key: 'getFiles',
        prerequisites: [],
        parameters: {
          taskParameters: [
            {
              // eslint-disable-next-line no-template-curly-in-string
              target: '${/input/objectName}',
              // eslint-disable-next-line no-template-curly-in-string
              namespaceName: '${/input/namespaceName}',
              // eslint-disable-next-line no-template-curly-in-string
              bucketName: '${/input/bucketName}',
              // eslint-disable-next-line no-template-curly-in-string
              objectName: '${/input/objectName}',
            },
          ],
        },
      },
      {
        type: 'transcode',
        version: 1,
        key: 'transcode',
        prerequisites: ['getFiles'],
        parameters: {
          transcodeType: 'standardTranscode',
          standardTranscode: {
            // eslint-disable-next-line no-template-curly-in-string
            input: '${/getFiles/taskParameters/0/target}',
            // eslint-disable-next-line no-template-curly-in-string
            outputPrefix: '${/output/objectNameFilename}index',
            videoCodec: 'h264',
            audioCodec: 'aac',
            packaging: {
              packageType: 'mp4',
              segmentLength: 6,
            },
            ladder: [
              {
                size: {
                  height: 360,
                  resizeMethod: 'scale',
                },
              },
            ],
          },
        },
      },
      {
        type: 'thumbnail',
        version: 1,
        key: 'thumbnail',
        prerequisites: ['transcode'],
        parameters: {
          thumbnails: {
            // eslint-disable-next-line no-template-curly-in-string
            input: '${/getFiles/taskParameters/0/target}',
            frameSelectors: [
              {
                namePrefix: 'tb',
                format: 'jpg',
                sizes: [
                  {
                    resizeMethod: 'scale',
                    height: 360,
                  },
                ],
                clipImagePicker: {
                  timeList: {
                    pickList: ['00:00:03'],
                  },
                },
              },
            ],
          },
        },
      },
      {
        type: 'putFiles',
        version: 1,
        key: 'putFiles',
        prerequisites: ['thumbnail'],
        parameters: {
          taskParameters: [
            {
              // eslint-disable-next-line no-template-curly-in-string
              namespaceName: '${/output/namespaceName}',
              // eslint-disable-next-line no-template-curly-in-string
              bucketName: '${/output/bucketName}',
              // eslint-disable-next-line no-template-curly-in-string
              source: '*.${/thumbnail/thumbnails/frameSelectors/0/format}',
              // eslint-disable-next-line no-template-curly-in-string
              objectName: '${/output/basePrefix}${/taskOutput/thumbnail}${/output/objectNameFilename}',
              // eslint-disable-next-line no-template-curly-in-string
              assetCompartmentId: '${/output/assetCompartmentId}',
              registerMetadata: true,
            },
            {
              // eslint-disable-next-line no-template-curly-in-string
              namespaceName: '${/output/namespaceName}',
              // eslint-disable-next-line no-template-curly-in-string
              bucketName: '${/output/bucketName}',
              // eslint-disable-next-line no-template-curly-in-string
              source: '*.mp4',
              // eslint-disable-next-line no-template-curly-in-string
              objectName: '${/output/basePrefix}${/taskOutput/transcode}',
              // eslint-disable-next-line no-template-curly-in-string
              assetCompartmentId: '${/output/assetCompartmentId}',
              registerMetadata: true,
            },
          ],
        },
      },
    ],
  },
  {
    displayName: `edugram-lecture-converter-480`,
    freeformTags: {
      resolution: '480',
      type: 'transcode',
    },
    tasks: [
      {
        type: 'getFiles',
        version: 1,
        key: 'getFiles',
        prerequisites: [],
        parameters: {
          taskParameters: [
            {
              // eslint-disable-next-line no-template-curly-in-string
              target: '${/input/objectName}',
              // eslint-disable-next-line no-template-curly-in-string
              namespaceName: '${/input/namespaceName}',
              // eslint-disable-next-line no-template-curly-in-string
              bucketName: '${/input/bucketName}',
              // eslint-disable-next-line no-template-curly-in-string
              objectName: '${/input/objectName}',
            },
          ],
        },
      },
      {
        type: 'transcode',
        version: 1,
        key: 'transcode',
        prerequisites: ['getFiles'],
        parameters: {
          transcodeType: 'standardTranscode',
          standardTranscode: {
            // eslint-disable-next-line no-template-curly-in-string
            input: '${/getFiles/taskParameters/0/target}',
            // eslint-disable-next-line no-template-curly-in-string
            outputPrefix: '${/output/objectNameFilename}index',
            videoCodec: 'h264',
            audioCodec: 'aac',
            packaging: {
              packageType: 'mp4',
              segmentLength: 6,
            },
            ladder: [
              {
                size: {
                  height: 480,
                  resizeMethod: 'scale',
                },
              },
            ],
          },
        },
      },
      {
        type: 'thumbnail',
        version: 1,
        key: 'thumbnail',
        prerequisites: ['transcode'],
        parameters: {
          thumbnails: {
            // eslint-disable-next-line no-template-curly-in-string
            input: '${/getFiles/taskParameters/0/target}',
            frameSelectors: [
              {
                namePrefix: 'tb',
                format: 'jpg',
                sizes: [
                  {
                    resizeMethod: 'scale',
                    height: 480,
                  },
                ],
                clipImagePicker: {
                  timeList: {
                    pickList: ['00:00:03'],
                  },
                },
              },
            ],
          },
        },
      },
      {
        type: 'putFiles',
        version: 1,
        key: 'putFiles',
        prerequisites: ['thumbnail'],
        parameters: {
          taskParameters: [
            {
              // eslint-disable-next-line no-template-curly-in-string
              namespaceName: '${/output/namespaceName}',
              // eslint-disable-next-line no-template-curly-in-string
              bucketName: '${/output/bucketName}',
              // eslint-disable-next-line no-template-curly-in-string
              source: '*.${/thumbnail/thumbnails/frameSelectors/0/format}',
              // eslint-disable-next-line no-template-curly-in-string
              objectName: '${/output/basePrefix}${/taskOutput/thumbnail}${/output/objectNameFilename}',
              // eslint-disable-next-line no-template-curly-in-string
              assetCompartmentId: '${/output/assetCompartmentId}',
              registerMetadata: true,
            },
            {
              // eslint-disable-next-line no-template-curly-in-string
              namespaceName: '${/output/namespaceName}',
              // eslint-disable-next-line no-template-curly-in-string
              bucketName: '${/output/bucketName}',
              // eslint-disable-next-line no-template-curly-in-string
              source: '*.mp4',
              // eslint-disable-next-line no-template-curly-in-string
              objectName: '${/output/basePrefix}${/taskOutput/transcode}',
              // eslint-disable-next-line no-template-curly-in-string
              assetCompartmentId: '${/output/assetCompartmentId}',
              // eslint-disable-next-line no-template-curly-in-string
              registerMetadata: true,
            },
          ],
        },
      },
    ],
  },
  {
    displayName: `edugram-lecture-converter-720`,
    freeformTags: {
      resolution: '720',
      type: 'transcode',
    },
    tasks: [
      {
        type: 'getFiles',
        version: 1,
        key: 'getFiles',
        prerequisites: [],
        parameters: {
          taskParameters: [
            {
              // eslint-disable-next-line no-template-curly-in-string
              target: '${/input/objectName}',
              // eslint-disable-next-line no-template-curly-in-string
              namespaceName: '${/input/namespaceName}',
              // eslint-disable-next-line no-template-curly-in-string
              bucketName: '${/input/bucketName}',
              // eslint-disable-next-line no-template-curly-in-string
              objectName: '${/input/objectName}',
            },
          ],
        },
      },
      {
        type: 'transcode',
        version: 1,
        key: 'transcode',
        prerequisites: ['getFiles'],
        parameters: {
          transcodeType: 'standardTranscode',
          standardTranscode: {
            // eslint-disable-next-line no-template-curly-in-string
            input: '${/getFiles/taskParameters/0/target}',
            // eslint-disable-next-line no-template-curly-in-string
            outputPrefix: '${/output/objectNameFilename}index',
            videoCodec: 'h264',
            audioCodec: 'aac',
            packaging: {
              packageType: 'mp4',
              segmentLength: 6,
            },
            ladder: [
              {
                size: {
                  height: 720,
                  resizeMethod: 'scale',
                },
              },
            ],
          },
        },
      },
      {
        type: 'thumbnail',
        version: 1,
        key: 'thumbnail',
        prerequisites: ['transcode'],
        parameters: {
          thumbnails: {
            // eslint-disable-next-line no-template-curly-in-string
            input: '${/getFiles/taskParameters/0/target}',
            frameSelectors: [
              {
                namePrefix: 'tb',
                format: 'jpg',
                sizes: [
                  {
                    resizeMethod: 'scale',
                    height: 720,
                  },
                ],
                clipImagePicker: {
                  timeList: {
                    pickList: ['00:00:03'],
                  },
                },
              },
            ],
          },
        },
      },
      {
        type: 'putFiles',
        version: 1,
        key: 'putFiles',
        prerequisites: ['thumbnail'],
        parameters: {
          taskParameters: [
            {
              // eslint-disable-next-line no-template-curly-in-string
              namespaceName: '${/output/namespaceName}',
              // eslint-disable-next-line no-template-curly-in-string
              bucketName: '${/output/bucketName}',
              // eslint-disable-next-line no-template-curly-in-string
              source: '*.${/thumbnail/thumbnails/frameSelectors/0/format}',
              // eslint-disable-next-line no-template-curly-in-string
              objectName: '${/output/basePrefix}${/taskOutput/thumbnail}${/output/objectNameFilename}',
              // eslint-disable-next-line no-template-curly-in-string
              assetCompartmentId: '${/output/assetCompartmentId}',
              registerMetadata: true,
            },
            {
              // eslint-disable-next-line no-template-curly-in-string
              namespaceName: '${/output/namespaceName}',
              // eslint-disable-next-line no-template-curly-in-string
              bucketName: '${/output/bucketName}',
              // eslint-disable-next-line no-template-curly-in-string
              source: '*.mp4',
              // eslint-disable-next-line no-template-curly-in-string
              objectName: '${/output/basePrefix}${/taskOutput/transcode}',
              // eslint-disable-next-line no-template-curly-in-string
              assetCompartmentId: '${/output/assetCompartmentId}',
              // eslint-disable-next-line no-template-curly-in-string
              registerMetadata: true,
            },
          ],
        },
      },
    ],
  },
  {
    displayName: `edugram-lecture-converter-1080`,
    freeformTags: {
      resolution: '1080',
      type: 'transcode',
    },
    tasks: [
      {
        type: 'getFiles',
        version: 1,
        key: 'getFiles',
        prerequisites: [],
        parameters: {
          taskParameters: [
            {
              // eslint-disable-next-line no-template-curly-in-string
              target: '${/input/objectName}',
              // eslint-disable-next-line no-template-curly-in-string
              namespaceName: '${/input/namespaceName}',
              // eslint-disable-next-line no-template-curly-in-string
              bucketName: '${/input/bucketName}',
              // eslint-disable-next-line no-template-curly-in-string
              objectName: '${/input/objectName}',
            },
          ],
        },
      },
      {
        type: 'transcode',
        version: 1,
        key: 'transcode',
        prerequisites: ['getFiles'],
        parameters: {
          transcodeType: 'standardTranscode',
          standardTranscode: {
            // eslint-disable-next-line no-template-curly-in-string
            input: '${/getFiles/taskParameters/0/target}',
            // eslint-disable-next-line no-template-curly-in-string
            outputPrefix: '${/output/objectNameFilename}index',
            videoCodec: 'h264',
            audioCodec: 'aac',
            packaging: {
              packageType: 'mp4',
              segmentLength: 6,
            },
            ladder: [
              {
                size: {
                  height: 1080,
                  resizeMethod: 'scale',
                },
              },
            ],
          },
        },
      },
      {
        type: 'thumbnail',
        version: 1,
        key: 'thumbnail',
        prerequisites: ['transcode'],
        parameters: {
          thumbnails: {
            // eslint-disable-next-line no-template-curly-in-string
            input: '${/getFiles/taskParameters/0/target}',
            frameSelectors: [
              {
                namePrefix: 'tb',
                format: 'jpg',
                sizes: [
                  {
                    resizeMethod: 'scale',
                    height: 1080,
                  },
                ],
                clipImagePicker: {
                  timeList: {
                    pickList: ['00:00:03'],
                  },
                },
              },
            ],
          },
        },
      },
      {
        type: 'putFiles',
        version: 1,
        key: 'putFiles',
        prerequisites: ['thumbnail'],
        parameters: {
          taskParameters: [
            {
              // eslint-disable-next-line no-template-curly-in-string
              namespaceName: '${/output/namespaceName}',
              // eslint-disable-next-line no-template-curly-in-string
              bucketName: '${/output/bucketName}',
              // eslint-disable-next-line no-template-curly-in-string
              source: '*.${/thumbnail/thumbnails/frameSelectors/0/format}',
              // eslint-disable-next-line no-template-curly-in-string
              objectName: '${/output/basePrefix}${/taskOutput/thumbnail}${/output/objectNameFilename}',
              // eslint-disable-next-line no-template-curly-in-string
              assetCompartmentId: '${/output/assetCompartmentId}',
              registerMetadata: true,
            },
            {
              // eslint-disable-next-line no-template-curly-in-string
              namespaceName: '${/output/namespaceName}',
              // eslint-disable-next-line no-template-curly-in-string
              bucketName: '${/output/bucketName}',
              // eslint-disable-next-line no-template-curly-in-string
              source: '*.mp4',
              // eslint-disable-next-line no-template-curly-in-string
              objectName: '${/output/basePrefix}${/taskOutput/transcode}',
              // eslint-disable-next-line no-template-curly-in-string
              assetCompartmentId: '${/output/assetCompartmentId}',
              // eslint-disable-next-line no-template-curly-in-string
              registerMetadata: true,
            },
          ],
        },
      },
    ],
  },
];

/**
 * Create pre-authenticated upload request for public images
 * @param path
 * @param file
 * @param expiry,
 * @param accessType
 */
const createPreAuthenticatedRequest = (
  path: string,
  file: string,
  expiry: Date,
  accessType: 'ObjectWrite' | 'ObjectRead' | 'ObjectReadWrite',
) =>
  new Promise<{ url: string; file: string }>(async (resolve, reject) => {
    try {
      const OracleConfig = JSON.parse((await getSecret('ORACLE')) as string);
      const provider = new common.SimpleAuthenticationDetailsProvider(
        OracleConfig.tenancy,
        OracleConfig.user,
        OracleConfig.fingerprint,
        OracleConfig.privateKey,
        null,
        // @ts-ignore
        common.Region[OracleConfig.regionKey],
      );
      const objectStorageClient = new objectStorage.ObjectStorageClient({
        authenticationDetailsProvider: provider,
      });
      const createPreauthenticatedRequestDetails = {
        name: file,
        objectName: `${path}/${file}`,
        accessType: objectStorage.models.CreatePreauthenticatedRequestDetails.AccessType[accessType],
        timeExpires: expiry,
      } as objectStorage.models.CreatePreauthenticatedRequestDetails;

      const createPreAuthenticatedRequestData: objectStorage.requests.CreatePreauthenticatedRequestRequest = {
        bucketName: OracleConfig.bucket,
        namespaceName: OracleConfig.namespaceName,
        createPreauthenticatedRequestDetails,
      };
      const data = await objectStorageClient.createPreauthenticatedRequest(createPreAuthenticatedRequestData);
      const url = `https://objectstorage.${OracleConfig.region}.oraclecloud.com${data.preauthenticatedRequest.accessUri}`;
      resolve({ url, file });
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Generate Pre-signed urls for multipart upload
 * @param parts
 * @param preSignedUrl
 */
const generatePreSignedUrlsParts = (parts: number = 0, preSignedUrl: string) =>
  new Promise<{ uploadId: string; urls: { [_key: number]: string } }>(async (resolve, reject) => {
    try {
      const today = new Date();
      const neverExpires = new Date(today);
      neverExpires.setHours(neverExpires.getHours() + 2);

      const OracleConfig = JSON.parse((await getSecret('ORACLE')) as string);
      const provider = new common.SimpleAuthenticationDetailsProvider(
        OracleConfig.tenancy,
        OracleConfig.user,
        OracleConfig.fingerprint,
        OracleConfig.privateKey,
        null,
        // @ts-ignore
        common.Region[OracleConfig.regionKey],
      );

      const signer = new common.DefaultRequestSigner(provider);

      const httpRequest: common.HttpRequest = {
        uri: preSignedUrl,
        headers: new fetch.Headers({
          'opc-multipart': 'true',
        }),
        method: 'PUT',
      };
      await signer.signHttpRequest(httpRequest);

      const response = await fetch(
        new fetch.Request(httpRequest.uri, {
          method: httpRequest.method,
          headers: httpRequest.headers,
          body: httpRequest.body,
        }),
      );

      const multipartUploadRequest: any = await response.json();

      const urls: { [_key: number]: string } = {};
      for (let i = 0; i < parts; i++) {
        const index = i + 1;
        urls[
          index
        ] = `https://objectstorage.${OracleConfig.region}.oraclecloud.com${multipartUploadRequest.accessUri}${index}`;
      }
      resolve({
        uploadId: multipartUploadRequest.uploadId,
        urls,
      });
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Finish Multipart upload
 * @param key
 * @param uploadId
 * @param parts
 */
const commitMultiPartUpload = (key: string, uploadId: string, parts: any[]) =>
  new Promise<any>(async (resolve, reject) => {
    try {
      const OracleConfig = JSON.parse((await getSecret('ORACLE')) as string);
      const provider = new common.SimpleAuthenticationDetailsProvider(
        OracleConfig.tenancy,
        OracleConfig.user,
        OracleConfig.fingerprint,
        OracleConfig.privateKey,
        null,
        // @ts-ignore
        common.Region[OracleConfig.regionKey],
      );
      const objectStorageClient = new objectStorage.ObjectStorageClient({
        authenticationDetailsProvider: provider,
      });
      const commitMultipartUploadDetails = {
        partsToCommit: parts,
      };
      const commitMultipartUploadRequest: objectStorage.requests.CommitMultipartUploadRequest = {
        namespaceName: OracleConfig.namespaceName,
        bucketName: OracleConfig.bucket,
        objectName: key,
        uploadId,
        commitMultipartUploadDetails,
      };
      const commitMultipartUploadResponse = await objectStorageClient.commitMultipartUpload(
        commitMultipartUploadRequest,
      );
      resolve(commitMultipartUploadResponse);
    } catch (err) {
      console.log('Oracle error: ', err);
      reject(err);
    }
  });

/**
 * Upload Object to Object storage
 * @param name
 * @param file
 */
const putObject = (name: string, file: Buffer) =>
  new Promise(async (resolve, reject) => {
    try {
      const OracleConfig = JSON.parse((await getSecret('ORACLE')) as string);
      const provider = new common.SimpleAuthenticationDetailsProvider(
        OracleConfig.tenancy,
        OracleConfig.user,
        OracleConfig.fingerprint,
        OracleConfig.privateKey,
        null,
        // @ts-ignore
        common.Region[OracleConfig.regionKey],
      );
      const objectStorageClient = new objectStorage.ObjectStorageClient({
        authenticationDetailsProvider: provider,
      });

      const putObjectRequest: objectStorage.requests.PutObjectRequest = {
        namespaceName: OracleConfig.namespaceName,
        bucketName: OracleConfig.bucket,
        objectName: name,
        putObjectBody: file,
      };
      const putObjectResponse = await objectStorageClient.putObject(putObjectRequest);
      resolve(putObjectResponse);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });
/**
 * Delete Object from Object Storage
 * @param key
 */
const deleteObject = (key: string) =>
  new Promise<any>(async (resolve, reject) => {
    try {
      const OracleConfig = JSON.parse((await getSecret('ORACLE')) as string);
      const provider = new common.SimpleAuthenticationDetailsProvider(
        OracleConfig.tenancy,
        OracleConfig.user,
        OracleConfig.fingerprint,
        OracleConfig.privateKey,
        null,
        // @ts-ignore
        common.Region[OracleConfig.regionKey],
      );
      const objectStorageClient = new objectStorage.ObjectStorageClient({
        authenticationDetailsProvider: provider,
      });
      const deleteObjectRequest: objectStorage.requests.DeleteObjectRequest = {
        namespaceName: OracleConfig.namespaceName,
        bucketName: OracleConfig.bucket,
        objectName: key,
      };
      const deleteObjectResponse = await objectStorageClient.deleteObject(deleteObjectRequest);
      resolve(deleteObjectResponse);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Check for file's existence in object storage
 * @param file
 */
const isFileReal = (file: string) =>
  new Promise<any>(async (resolve, reject) => {
    try {
      const OracleConfig = JSON.parse((await getSecret('ORACLE')) as string);
      const provider = new common.SimpleAuthenticationDetailsProvider(
        OracleConfig.tenancy,
        OracleConfig.user,
        OracleConfig.fingerprint,
        OracleConfig.privateKey,
        null,
        // @ts-ignore
        common.Region[OracleConfig.regionKey],
      );
      const objectStorageClient = new objectStorage.ObjectStorageClient({
        authenticationDetailsProvider: provider,
      });
      const headObjectRequest: objectStorage.requests.HeadObjectRequest = {
        namespaceName: OracleConfig.namespaceName,
        bucketName: OracleConfig.bucket,
        objectName: file,
      };
      const headObjectResponse = await objectStorageClient.headObject(headObjectRequest);
      resolve(headObjectResponse);
    } catch (err: any) {
      if (err.statusCode === 404) {
        resolve(false);
      } else {
        reject(err);
      }
    }
  });

/**
 * Generates pre authenticated url
 * @param file
 */
const generateUrl = (file: string) =>
  new Promise<string>(async (resolve, reject) => {
    try {
      const today = new Date();
      const neverExpires = new Date(today);
      neverExpires.setHours(neverExpires.getFullYear() + 5);

      const OracleConfig = JSON.parse((await getSecret('ORACLE')) as string);
      const provider = new common.SimpleAuthenticationDetailsProvider(
        OracleConfig.tenancy,
        OracleConfig.user,
        OracleConfig.fingerprint,
        OracleConfig.privateKey,
        null,
        // @ts-ignore
        common.Region[OracleConfig.regionKey],
      );
      const objectStorageClient = new objectStorage.ObjectStorageClient({
        authenticationDetailsProvider: provider,
      });
      const createPreauthenticatedRequestDetails = {
        name: file,
        objectName: file,
        accessType: objectStorage.models.CreatePreauthenticatedRequestDetails.AccessType.ObjectRead,
        timeExpires: neverExpires,
      } as objectStorage.models.CreatePreauthenticatedRequestDetails;

      const createPreAuthenticatedRequestData: objectStorage.requests.CreatePreauthenticatedRequestRequest = {
        bucketName: OracleConfig.bucket,
        namespaceName: OracleConfig.namespaceName,
        createPreauthenticatedRequestDetails,
      };
      const data = await objectStorageClient.createPreauthenticatedRequest(createPreAuthenticatedRequestData);
      const url = `https://objectstorage.${OracleConfig.region}.oraclecloud.com${data.preauthenticatedRequest.accessUri}`;
      resolve(url);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * List all media flows
 */
const listMediaFlows = () =>
  new Promise<any[]>(async (resolve, reject) => {
    try {
      const OracleConfig = JSON.parse((await getSecret('ORACLE')) as string);
      const provider = new common.SimpleAuthenticationDetailsProvider(
        OracleConfig.tenancy,
        OracleConfig.user,
        OracleConfig.fingerprint,
        OracleConfig.privateKey,
        null,
        // @ts-ignore
        common.Region[OracleConfig.regionKey],
      );
      const mediaServicesClient = new mediaServices.MediaServicesClient({
        authenticationDetailsProvider: provider,
      });

      const listMediaWorkflowsRequest: mediaServices.requests.ListMediaWorkflowsRequest = {
        compartmentId: OracleConfig.compartmentId,
        lifecycleState: 'ACTIVE',
      };
      const listMediaWorkflowsResponse = await mediaServicesClient.listMediaWorkflows(listMediaWorkflowsRequest);
      resolve(listMediaWorkflowsResponse?.mediaWorkflowCollection?.items);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

const createMediaFlow = (mediaFlowConfig: (typeof mediaFlowsConfigs)[1]) =>
  new Promise<any>(async (resolve, reject) => {
    try {
      const OracleConfig = JSON.parse((await getSecret('ORACLE')) as string);
      const provider = new common.SimpleAuthenticationDetailsProvider(
        OracleConfig.tenancy,
        OracleConfig.user,
        OracleConfig.fingerprint,
        OracleConfig.privateKey,
        null,
        // @ts-ignore
        common.Region[OracleConfig.regionKey],
      );
      const mediaServicesClient = new mediaServices.MediaServicesClient({
        authenticationDetailsProvider: provider,
      });

      const createMediaWorkflowDetails = {
        displayName: mediaFlowConfig.displayName,
        compartmentId: OracleConfig.compartmentId,
        freeformTags: mediaFlowConfig.freeformTags,
        parameters: {
          input: {},
          output: {
            // eslint-disable-next-line no-template-curly-in-string
            basePrefix: '${/output/objectNamePath}',
            objectName: 'temp/',
            objectNamePath: 'temp/',
            objectNameFilename: '',
            assetCompartmentId: OracleConfig.compartmentId,
          },
          taskOutput: {
            transcode: '',
            thumbnail: '',
          },
        },
        tasks: mediaFlowConfig.tasks,
      };

      const createMediaWorkflowRequest: mediaServices.requests.CreateMediaWorkflowRequest = {
        // @ts-ignore
        createMediaWorkflowDetails,
      };
      const createMediaWorkflowResponse = await mediaServicesClient.createMediaWorkflow(createMediaWorkflowRequest);
      resolve(createMediaWorkflowResponse);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

/**
 * Delete Media Flow
 * @param mediaWorkflowId
 */
const deleteMediaFlow = (mediaWorkflowId: string) =>
  new Promise(async (resolve, reject) => {
    try {
      const OracleConfig = JSON.parse((await getSecret('ORACLE')) as string);
      const provider = new common.SimpleAuthenticationDetailsProvider(
        OracleConfig.tenancy,
        OracleConfig.user,
        OracleConfig.fingerprint,
        OracleConfig.privateKey,
        null,
        // @ts-ignore
        common.Region[OracleConfig.regionKey],
      );
      const mediaServicesClient = new mediaServices.MediaServicesClient({
        authenticationDetailsProvider: provider,
      });
      const deleteMediaWorkflowRequest: mediaServices.requests.DeleteMediaWorkflowRequest = {
        mediaWorkflowId,
      };
      const deleteMediaWorkflowResponse = await mediaServicesClient.deleteMediaWorkflow(deleteMediaWorkflowRequest);
      resolve(deleteMediaWorkflowResponse);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

const createMediaFlowJob = (mediaWorkflowId: string, path: string, fileName: string, suffix: string) =>
  new Promise(async (resolve, reject) => {
    try {
      const OracleConfig = JSON.parse((await getSecret('ORACLE')) as string);
      const provider = new common.SimpleAuthenticationDetailsProvider(
        OracleConfig.tenancy,
        OracleConfig.user,
        OracleConfig.fingerprint,
        OracleConfig.privateKey,
        null,
        // @ts-ignore
        common.Region[OracleConfig.regionKey],
      );
      const mediaServicesClient = new mediaServices.MediaServicesClient({
        authenticationDetailsProvider: provider,
      });
      const createMediaWorkflowJobDetails = {
        workflowIdentifierType: 'ID',
        mediaWorkflowId,
        compartmentId: OracleConfig.compartmentId,
        displayName: `${fileName}-${suffix}`,
        parameters: {
          input: {
            bucketName: OracleConfig.bucket,
            namespaceName: OracleConfig.namespaceName,
            objectName: `${path}/${fileName}`,
          },
          output: {
            // eslint-disable-next-line no-template-curly-in-string
            basePrefix: '${/output/objectNamePath}',
            objectName: `${path}/`,
            objectNamePath: `${path}/${suffix}/${fileName}/`,
            objectNameFilename: '',
            assetCompartmentId: OracleConfig.compartmentId,
            bucketName: OracleConfig.bucket,
            namespaceName: OracleConfig.namespaceName,
          },
          taskOutput: {
            transcode: '',
            thumbnail: '',
          },
        },
      };

      const createMediaWorkflowJobRequest: mediaServices.requests.CreateMediaWorkflowJobRequest = {
        createMediaWorkflowJobDetails,
      };

      // Send request to the Client.
      const createMediaWorkflowJobResponse = await mediaServicesClient.createMediaWorkflowJob(
        createMediaWorkflowJobRequest,
      );
      resolve(createMediaWorkflowJobResponse);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

export default {
  mediaFlowsConfigs,
  createPreAuthenticatedRequest,
  generatePreSignedUrlsParts,
  commitMultiPartUpload,
  putObject,
  deleteObject,
  isFileReal,
  generateUrl,
  listMediaFlows,
  createMediaFlow,
  deleteMediaFlow,
  createMediaFlowJob,
};
