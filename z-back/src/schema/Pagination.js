const typeDef = `
  input Page {
    limit: Int
    offset: Int
  }
  type PageInfo {
    total: Int!
  }
  interface PageResult {
    pageInfo: PageInfo!
  }
`;

const pageArgs = args => {
  const { page = {} } = args;
  const { offset = 0, limit = 99999 } = page;
  return { offset, limit };
};

export { typeDef, pageArgs };
