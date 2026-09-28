module.exports = {
  apps: [
    {
      name: "loretree",
      script: "node_modules/next/dist/bin/next",
      args: "dev -p 3013",
      cwd: __dirname,
    },
  ],
};
