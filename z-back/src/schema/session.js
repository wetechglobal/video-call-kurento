class Session {
  constructor(dbSession) {
    this.id = dbSession.id;
    this.lastAccessTime = dbSession.lastAccessTime;
    this.lastAccessInfo = dbSession.lastAccessInfo;
  }
}

const typeDef = `
  type Session {
    id: ID!
    lastAccessTime: Date!
    lastAccessInfo: String!
  }
  type SessionList implements PageResult {
    sessions: [Session!]!
    pageInfo: PageInfo!
  }

  type Query {
    sessionCurr: Session!
    sessionOthers(page: Page): SessionList!
  }
`;

const resolver = {
  Query: {
    sessionCurr: async (rootValue, args, req, info) => {
      // TODO
    },
    sessionOthers: async (rootValue, args, req, info) => {
      // TODO
    },
  },
};

export { Session, typeDef, resolver };
