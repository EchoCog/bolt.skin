
# Workers for Platforms

Extend the capabilities of Cloudflare Workers to customers of your SaaS applications and deploy serverless functions on their behalf.
Workers for Platforms documentation


Create a namespace with Wrangler CLI
In this guide you will configure a 
dynamic dispatch namespace
, a 
user Worker
 and a 
dynamic dispatch Worker
.

1: Create a dispatch namespace
The first step to working with Workers for Platforms is to create a dispatch namespace. A dispatch namespace is made up of a collection of 
user Workers
.

This command creates a new dispatch namespace called "staging".

npx wrangler dispatch-namespace create staging
Click to copy
If Wrangler is not already authenticated with your Cloudflare account, do that now by following 
authentication instructions

2: Upload a user Worker to the dispatch namespace
You will now create a Worker called customer-worker-1.

npm create cloudflare@latest customer-worker-1 -- --type=hello-world
Click to copy
The last step in the C3 flow is deploying the application. When prompted, select No.

Navigate to your project directory.

cd customer-worker-1
Click to copy
To deploy your application to the dispatch namespace run the following command:

wrangler deploy --dispatch-namespace staging
Click to copy
3: Create a dispatch Worker
Next, give your dispatch Worker the logic it needs to route to the user Worker in step 2.

Navigate out of your user Worker directory.

cd ..
Click to copy
Create your dispatch Worker.

npm create cloudflare@latest my-dispatcher -- --type=hello-world
Click to copy
Navigate to your project directory.

cd my-dispatcher
Click to copy
Open the wranger.toml file in your project directory and add the dispatch namespace binding.

[[dispatch_namespaces]]
binding = "dispatcher"
namespace = "<NAMESPACE_NAME>"
Click to copy
Add the following to your index.js file.

export default {
  async fetch(req, env) {
    const worker = env.dispatcher.get("customer-worker-1");
    return worker.fetch(req);
  }
}
Click to copy
4: Deploy
Publish your dispatch Worker to the Cloudflare network.

npx wrangler deploy
Click to copy
5: Test a request
Send a request to the route your dispatch Worker is on. You should receive the response (Hello world) from your user Worker (customer-worker-1).

curl https://my-dispatcher.<YOUR_WORKERS_SUBDOMAIN>.workers.dev/
Click to copy
That's it! 
To support you along your journey developing Workers for Platforms here are some resources.

Workers for Platforms docs
Learn more about how Workers for Platforms works, the features it offers and limits.

Workers for Platforms starter project
An example project to get started with Workers for Platforms.

Have questions? Need help? Want to show off what you're building? Join our Cloudflare Developer community on 
Discord
.

