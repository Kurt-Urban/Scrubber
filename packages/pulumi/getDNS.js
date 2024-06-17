const pulumi = require("@pulumi/pulumi");
const fs = require("fs");

async function fetchPulumiOutputs() {
  try {
    const stack = new pulumi.StackReference("Kurt-Urban/prod");
    const loadBalancerDNS = await stack.getOutputValue("loadBalancerDNS");

    const config = {
      loadBalancerDNS: loadBalancerDNS,
    };

    fs.writeFileSync(
      "../frontend/config.json",
      JSON.stringify(config, null, 2)
    );
    console.log("Pulumi outputs fetched and saved to config.json");
  } catch (error) {
    console.error("Failed to get Pulumi outputs:", error);
    process.exit(1);
  }
}

fetchPulumiOutputs();
