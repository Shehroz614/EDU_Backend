import oracle from '@services/oracle';

/**
 * Generate Multi Res URLs for OCI Storage
 * @param path
 * @param contentName
 */
const generateMultiResURLs = (path: string, contentName: string): Object =>
  new Promise(async (resolve, reject) => {
    try {
      const resolutions = ['original', 1080, 720, 480, 360];
      const urls: any = {};

      const generateUrlPromises = resolutions.map(async (r) => {
        let thumbnailPromise;
        let videoPromise;
        if (r === 'original') {
          thumbnailPromise = null;
          videoPromise = oracle.generateUrl(`${path}/${contentName}`);
        } else {
          const tbURL = `${path}/${r}/${contentName}/tb_${r}-1.jpg`;
          const videoURL = `${path}/${r}/${contentName}/index.mp4`;

          const [tbExists, videoExists] = await Promise.all([oracle.isFileReal(tbURL), oracle.isFileReal(videoURL)]);

          thumbnailPromise = tbExists ? oracle.generateUrl(tbURL) : null;
          videoPromise = videoExists ? oracle.generateUrl(videoURL) : null;
        }

        const [thumbnailUrl, videoUrl] = await Promise.all([thumbnailPromise, videoPromise]);

        urls[r] = {
          thumbnail: thumbnailUrl,
          video: videoUrl,
        };
      });
      await Promise.all(generateUrlPromises);
      resolve(urls);
    } catch (err) {
      console.log(err);
      reject(err);
    }
  });

export default generateMultiResURLs;
