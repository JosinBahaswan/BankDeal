export default async function handler(req, res) {
  // Mock proxy for BatchData / BatchLeads off-market properties
  // Accepts optional filters in body but returns placeholder data for now.
  const mock = [
    {
      id: "p-1",
      address: "123 Main St, Sacramento, CA 95814",
      ownerName: "John Doe",
      ownerPhone: "+1-916-555-0001",
      ownerEmail: "john.doe@example.com",
      equity: 85000,
      propertyType: "SFR",
      listType: "Vacant",
    },
    {
      id: "p-2",
      address: "456 Oak Ave, Roseville, CA 95678",
      ownerName: "Maria Lopez",
      ownerPhone: "+1-916-555-0102",
      ownerEmail: "maria.lopez@example.com",
      equity: 120000,
      propertyType: "SFR",
      listType: "Absentee Owner",
    },
    {
      id: "p-3",
      address: "789 Pine Rd, Folsom, CA 95630",
      ownerName: "Carlos Rivera",
      ownerPhone: "+1-916-555-0203",
      ownerEmail: "c.rivera@example.com",
      equity: 40000,
      propertyType: "Duplex",
      listType: "Probate",
    },
  ];

  // Respect filters lightly if provided (for dev/testing)
  try {
    const body = req.method === "POST" ? (req.body || {}) : req.query || {};
    const filters = body.filters || [];
    let results = mock;
    if (Array.isArray(filters) && filters.length > 0) {
      results = mock.filter((p) => filters.some((f) => (p.listType || "").toLowerCase().includes(f.toLowerCase())));
    }

    return res.status(200).json({ properties: results });
  } catch (err) {
    console.error("offmarket-properties error", err);
    return res.status(500).json({ error: "mock error" });
  }
}
