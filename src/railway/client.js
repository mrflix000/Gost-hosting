const endpoint = process.env.RAILWAY_GRAPHQL_URL || "https://backboard.railway.com/graphql/v2";

export async function railwayRequest(query, variables = {}) {
  const token = process.env.RAILWAY_API_TOKEN;
  if (!token) throw new Error("Railway API is not configured. Set RAILWAY_API_TOKEN.");

  const r = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(25000)
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.errors?.length) {
    throw new Error(j.errors?.map(x => x.message).join("; ") || `Railway HTTP ${r.status}`);
  }
  return j.data;
}

export async function listProjects() {
  const d = await railwayRequest(`query { projects { edges { node { id name createdAt } } } }`);
  return d.projects.edges.map(x => x.node);
}

export async function createService(projectId, name, repository) {
  const q = `mutation serviceCreate($input: ServiceCreateInput!) {
    serviceCreate(input: $input) { id name }
  }`;
  const d = await railwayRequest(q, {
    input: { projectId, name, source: { repo: repository } }
  });
  return d.serviceCreate;
}

export async function deploy(serviceId, environmentId) {
  const q = `mutation deploy($serviceId: String!, $environmentId: String!) {
    serviceInstanceDeployV2(serviceId: $serviceId, environmentId: $environmentId)
  }`;
  return railwayRequest(q, { serviceId, environmentId });
}

export async function redeploy(serviceId, environmentId) {
  const q = `mutation redeploy($serviceId: String!, $environmentId: String!) {
    serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
  }`;
  return railwayRequest(q, { serviceId, environmentId });
}

export async function deleteService(id) {
  return railwayRequest(
    `mutation deleteService($id: String!) { serviceDelete(id: $id) }`,
    { id }
  );
}
