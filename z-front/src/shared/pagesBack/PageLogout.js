import { gql, graphql, withApollo } from 'react-apollo';
import { withRouter } from 'react-router-dom';

import browserStorage from '../utils/browserStorage';
import { showApolloError } from '../utils/errors';

const logoutGql = gql`
  mutation logout {
    logout
  }
`;

const PageLogout = props => {
  props
    .logout()
    .then(() => {
      browserStorage.remove('authToken');
      props.client.resetStore();
      props.history.replace('/-/login');
    })
    .catch(err => {
      showApolloError(err);
      window.location.href = '/-/login';
    });
  return null;
};

const WithGraphQL = graphql(logoutGql, { name: 'logout' })(PageLogout);
const ThenWithApollo = withApollo(WithGraphQL);
const ThenWithRouter = withRouter(ThenWithApollo);

export default ThenWithRouter;
