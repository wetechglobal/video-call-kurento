import { gql, graphql } from 'react-apollo';

const getVideoSessionListQuery = gql`
  query getVideoSessionList {
    getVideoSessionList {
      id
      title
      caseId
      note
      status
      time
    }
  }
`;

class VideoSessionAPI {
  getList = () =>
    this.props
      .getVideoSessionList()
      .then(({ data }) => data.getVideoSessionList)
      .catch(() => []);
}

const graphqlAPI = graphql(getVideoSessionListQuery, { name: 'getVideoSessionList' })(
  VideoSessionAPI,
);

export { graphqlAPI, VideoSessionAPI };
