export const readLogFile = (path: string): string => {
  // Lightweight mock to keep admin console functional without filesystem access
  return `# Virtual Disk Log
Requested: ${path}
Timestamp: ${new Date().toISOString()}
Status: OK`;
};
