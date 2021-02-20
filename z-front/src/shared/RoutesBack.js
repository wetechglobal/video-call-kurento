import { LocaleProvider } from 'antd';
import enUS from 'antd/lib/locale-provider/en_US';
import React from 'react';
import { Route, Switch } from 'react-router-dom';
import Page404 from './pagesBack/Page404';
import PageCaseDetail from './pagesBack/PageCaseDetail';
import PageCaseList from './pagesBack/PageCaseList';
import PageForgotRecover from './pagesBack/PageForgotRecover';
import PageForgotRequest from './pagesBack/PageForgotRequest';
import PageLogin from './pagesBack/PageLogin';
import PageLogout from './pagesBack/PageLogout';
import PageUserList from './pagesBack/PageUserList';
import PageVerify from './pagesBack/PageVerify';
import './RoutesBack.scss';
import NormalizePath from './utils/NormalizePath';
import DictationContainer from './DictationContainer';

const RoutesBack = () => (
  <DictationContainer>
    <LocaleProvider locale={enUS}>
      <NormalizePath>
        <Switch>
          <Route path="/-/login" component={PageLogin} />
          <Route path="/-/logout" component={PageLogout} />
          <Route path="/-/forgot" component={PageForgotRequest} />
          <Route path="/-/recover" component={PageForgotRecover} />
          <Route path="/-/verify" component={PageVerify} />

          <Route path="/-" exact component={PageCaseList} />
          <Route path="/-/cases" exact component={PageCaseList} />
          <Route path="/-/cases/:id" component={PageCaseDetail} />

          <Route path="/-/users" exact component={PageUserList} />

          <Route component={Page404} />
        </Switch>
      </NormalizePath>
    </LocaleProvider>
  </DictationContainer>
);

export default RoutesBack;
