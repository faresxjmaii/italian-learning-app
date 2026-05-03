export const sendJson = (res, status, payload) => {
  res.setHeader?.('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(payload);
};

export const isConfiguredSecret = (value, placeholder) =>
  Boolean(value && value !== placeholder);
