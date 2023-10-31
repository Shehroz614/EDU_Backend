import express, { Request, Response, NextFunction } from 'express';

const router = express.Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.ignore = true
   */
  try {
    res.send(`
                <!doctype html>
                <html lang='en'>
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <title>Edugram - Swagger Doc</title>
                    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui.css" />
                  </head>
                  
                  <body>
                    <div id="swagger"></div>
                    <script src="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui-bundle.js" crossorigin></script>
                    <script>
                      window.onload = () => {
                        window.ui = SwaggerUIBundle({
                          url: '/api/doc/swagger.json',
                          dom_id: '#swagger',
                        });
                      };
                    </script>
                  </body>
                </html>
    `);
  } catch (err) {
    next(err);
  }
});
router.get('/swagger.json', async (req: Request, res: Response, next: NextFunction) => {
  /**
   * #swagger.ignore = true
   */
  try {
    // eslint-disable-next-line global-require
    const swagger = require('../doc/swagger.json');
    res.send(swagger);
  } catch (err) {
    next(err);
  }
});

export default router;
