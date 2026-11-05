// Adds the website address prefix when building for GitHub Pages
// (the site lives at https://<your-name>.github.io/<repo-name>/).
// The GitHub workflow sets BASE_URL automatically; normal phone builds ignore it.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...(config.experiments || {}),
    ...(process.env.BASE_URL ? { baseUrl: process.env.BASE_URL } : {}),
  },
});
