const fs = require('fs');

let config = process.argv[2];
let template_environment = fs.readFileSync('./src/environments/environment.template.ts').toString();
let envconfig = JSON.parse(fs.readFileSync('./src/assets/config/envconfig.json').toString());

Object.keys(process.env).forEach((env_var) => {
  // Handle TypeScript environment file
  let regex = new RegExp(`(${env_var}:)(\\s*?)('.*?'|".*?")`);
  template_environment = template_environment.replace(
    regex,
    `${env_var}: '${process.env[env_var]}'`
  );

  // Handle JSON config file
  if (envconfig.hasOwnProperty(env_var)) {
    envconfig[env_var] = process.env[env_var];
  }
});

if (config && config === 'prod')
  fs.writeFileSync(`./src/environments/environment.${config}.ts`, template_environment);
else fs.writeFileSync('./src/environments/environment.ts', template_environment);

fs.writeFileSync('./src/assets/config/envconfig.json', JSON.stringify(envconfig, null, 2));
