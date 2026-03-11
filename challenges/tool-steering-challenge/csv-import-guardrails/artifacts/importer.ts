type ContactRow = {
  email?: string;
  full_name?: string;
  company?: string;
};

type ImportResult = {
  imported: number;
  errors: string[];
};

export function importContacts(rows: ContactRow[]): ImportResult {
  const result: ImportResult = {
    imported: 0,
    errors: [],
  };

  for (const row of rows) {
    saveContact({
      email: row.email ?? "",
      fullName: row.full_name ?? "",
      company: row.company ?? "",
    });

    result.imported += 1;
  }

  return result;
}

function saveContact(contact: { email: string; fullName: string; company: string }) {
  return contact;
}
