const getConfig = () => {
    const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
        const error = new Error(
            'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
        );
        error.statusCode = 503;
        throw error;
    }

    return { url, serviceRoleKey };
};

const parseResponse = async (response) => {
    const text = await response.text();
    if (!response.ok) {
        const error = new Error(`Supabase request failed (${response.status}).`);
        error.statusCode = 502;
        error.cause = text;
        throw error;
    }

    return text ? JSON.parse(text) : null;
};

const request = async (table, { method = 'GET', query, body, prefer } = {}) => {
    const { url, serviceRoleKey } = getConfig();
    const endpoint = new URL(`${url}/rest/v1/${table}`);

    Object.entries(query || {}).forEach(([key, value]) => {
        endpoint.searchParams.set(key, value);
    });

    const response = await fetch(endpoint, {
        method,
        headers: {
            apikey: serviceRoleKey,
            authorization: `Bearer ${serviceRoleKey}`,
            'content-type': 'application/json',
            ...(prefer ? { prefer } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    return parseResponse(response);
};

module.exports = { getConfig, request };
