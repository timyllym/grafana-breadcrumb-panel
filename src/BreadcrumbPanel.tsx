/**
 * <h3>Breadcrumb panel for Grafana</h3>
 *
 * This breadcumb panel utilizes session storage to store dashboards where user has visited.
 * When panel is loaded it first checks if breadcrumb is given in url params and utilizes that.
 * If no breadcrumb is given in url params then panel tries to read breadcrumb from session storage.
 * Finally the panel adds the just loaded dashboard as the latest item in dashboard and updates session storage.
 * Breadcrumb stores the dashboard's name, url and possible query params to the session storage.
 * If user navigates with browser back button then last item is popped out of breadcrumb.
 * Also if user navigates by clicking one of the breadcrumb items then the items following the selected
 * item are removed from breadcrumb, user is moved to selected dashboard and session storage is updated.
 */

import React, { useState, useEffect } from 'react';
import { PanelProps } from '@grafana/data';
import { getBackendSrv } from '@grafana/runtime';
import { BreadcrumbOptions } from 'types';
import _ from 'lodash';

interface Props extends PanelProps<BreadcrumbOptions> {}

const backendSrv = getBackendSrv();
let allDashboards: any[] = [];
let rootDashboardList: any[] = [];

export const BreadcrumbPanel: React.FC<Props> = ({ options }) => {
  const [dashboardList, setDashboardList] = useState([] as any[]);

  useEffect(() => {
    // Check for browser session storage and create one if it doesn't exist
    if (!sessionStorage.getItem('dashlist') || options.isRootDashboard) {
      sessionStorage.setItem('dashlist', '[]');
    }
    // Check if URL params has breadcrumb
    const paramsObj = parseParamsObject(window.location.search);
    if (paramsObj['breadcrumb']) {
      const items = paramsObj['breadcrumb'].split(',');
      createDashboardList(items, setDashboardList);
    } else {
      // If no URL params are given then get dashboard list from session storage
      rootDashboardList = JSON.parse(sessionStorage.getItem('dashlist') || '[]');
    }
    updateText(options, rootDashboardList, setDashboardList);
    // Listen for PopState events so we know when user navigates back with browser
    // On back navigation we'll remove the last item of breadcrumb
    window.onpopstate = (event: Event) => {
      if (rootDashboardList.length > 0) {
        rootDashboardList.pop();
        sessionStorage.setItem('dashlist', JSON.stringify(rootDashboardList));
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const navigate = (url: string, params: string) => {
    // Check if user is navigating backwards in breadcrumb and
    // remove all items that follow the selected item in that case
    const index = _.findIndex(dashboardList, (dbItem: any) => dbItem.url.indexOf(`${url}`) > -1);
    if (index > -1 && dashboardList.length >= index + 2) {
      dashboardList.splice(index + 1, dashboardList.length - index - 1);
      sessionStorage.setItem('dashlist', JSON.stringify(dashboardList));
    }
    // Parse params string to object
    const queryParams = parseParamsObject(params);
    // Delete possible breadcrumb param so that breadcrumb from session will be used instead
    delete queryParams['breadcrumb'];
  };

  return (
    <>
      {!options.hideTextInRootDashboard ? (
        <ol className="breadcrumb-container">
          {dashboardList.map((dashboard: any, index: number) => (
            <li key={'item' + index}>
              <a href={dashboard.fullUrl} onClick={() => navigate(dashboard.url, dashboard.params)}>
                {dashboard.name}
              </a>
              <svg height="10" viewBox="0 0 10 10" width="10" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.1,0L1.9,1.2L5.7,5L1.9,8.8L3.1,10l5-5L3.1,0z" />
                <path d="M-7-7h24v24H-7V-7z" fill="none" />
              </svg>
            </li>
          ))}
        </ol>
      ) : null}
    </>
  );
};

/**
 * Create dashboard items
 * @param {string[]} items Array of dashboard ids
 */
const createDashboardList = (items: string[], setDashboardList: any) => {
  if (allDashboards) {
    // Dashboard data has been loaeded from Grafana
    filterDashboardList(items, allDashboards, setDashboardList);
  } else {
    // Fetch list of all dashboards from Grafana
    backendSrv.get('api/search').then((result: any) => {
      filterDashboardList(items, result, setDashboardList);
    });
  }
};

/**
 * Filter dashboard list
 * @param {string[]} DBlist Array of dashboards ids to be displayed
 * @param {any} allDBs All dashboards fetched from Grafana API
 */
const filterDashboardList = (DBlist: string[], allDBs: any, setDashboardList: any) => {
  const paramsObj = parseParamsObject(window.location.search);
  const orgId = paramsObj['orgId'];
  const urlRoot = window.location.href.substr(0, window.location.href.indexOf('/d/') + 1);
  const dashboardList = DBlist.filter((filterItem: string) => {
    const isInDatabase = _.findIndex(allDBs, (dbItem: any) => dbItem.url.indexOf(`/d/${filterItem}`) > -1) > -1;
    return isInDatabase;
  }).map((item: string) => {
    const uid = _.find(allDBs, (dbItem) => dbItem.url.indexOf(`/d/${item}`) > -1).uid;
    return {
      url: `/d/${uid}`,
      name: _.find(allDBs, (dbItem) => dbItem.url.indexOf(`/d/${item}`) > -1).title,
      params: parseParamsString({ orgId }),
      uid,
      fullUrl: urlRoot + '/d/' + uid + parseParamsString({ orgId }),
    };
  });
  setDashboardList(dashboardList);
  rootDashboardList = dashboardList;
  // Update session storage
  sessionStorage.setItem('dashlist', JSON.stringify(dashboardList));
};

/**
 * Parse breadcrumb string for URL
 * @returns {string}
 */
const parseBreadcrumbForUrl = (dashboardList: any[]) => {
  let parsedBreadcrumb = '';
  dashboardList.map((item, index) => {
    parsedBreadcrumb += item.url.split('/').pop();
    if (index < dashboardList.length - 1) {
      parsedBreadcrumb += ',';
    }
  });
  return parsedBreadcrumb;
};

/**
 * Update Breadcrumb items
 */
const updateText = (options: any, dashboardList: any[], setDashboardList: any) => {
  // Get Grafana query params
  let grafanaQueryParams = '';
  const paramsObj = parseParamsObject(window.location.search);
  Object.keys(paramsObj).map((param) => {
    if (paramsObj[param] && paramsObj[param] !== 'null') {
      grafanaQueryParams += '&' + param + '=' + paramsObj[param];
    }
  });
  // Fetch list of all dashboards from Grafana
  backendSrv.get('api/search').then((result: any) => {
    allDashboards = result;
    // Set current dashboard
    const path = window.location.pathname.split('/');
    path.pop();
    const dbSource = '/d/' + path.pop();
    const uri = `${dbSource}`;
    const obj: any = _.find(result, (dbItem) => dbItem.url.indexOf(`${uri}`) > -1);
    const newDashboardList = _.cloneDeep(dashboardList);
    // Add current dashboard to breadcrumb if it doesn't exist
    if (_.findIndex(newDashboardList, (dbItem) => dbItem.url.indexOf(`${uri}`) > -1) < 0 && obj) {
      newDashboardList.push({
        url: uri,
        name: obj.title,
        params: grafanaQueryParams,
        uid: obj.uid,
        fullUrl: window.location.href,
      });
    }
    // If the amount of items exceeds the maximum then remove oldest item
    const breadcrumbItemsMaxAmount = parseInt(options.breadcrumbItemsMaxAmount, 10);
    if (!isNaN(breadcrumbItemsMaxAmount) && newDashboardList.length > breadcrumbItemsMaxAmount) {
      newDashboardList.shift();
    }
    setDashboardList(newDashboardList);
    // Update session storage
    sessionStorage.setItem('dashlist', JSON.stringify(newDashboardList));
    // Parse modified breadcrumb and set it to url query params
    const parsedBreadcrumb = parseBreadcrumbForUrl(dashboardList);
    const queryObject = parseParamsObject(grafanaQueryParams);
    queryObject['breadcrumb'] = parsedBreadcrumb;
    history.replaceState(queryObject, '');
  });
};

/**
 * Parse params string to object
 * @param {string} params
 * @returns {Object}
 */
const parseParamsObject = (params: string) => {
  const paramsObj: any = {};
  if (params.charAt(0) === '?' || params.charAt(0) === '&') {
    params = params.substr(1, params.length);
  }
  const paramsArray = params.split('&');
  paramsArray.map((paramItem) => {
    const paramItemArr = paramItem.split('=');
    paramsObj[paramItemArr[0]] = paramItemArr[1];
  });
  return paramsObj;
};

/**
 * Parse params object to string
 * @param {Object} params
 * @returns {string}
 */
const parseParamsString = (params: any) => {
  let paramsString = '?';
  Object.keys(params).map((paramKey, index) => {
    paramsString += paramKey + '=' + params[paramKey];
    if (index < Object.keys(params).length - 1) {
      paramsString += '&';
    }
  });
  return paramsString;
};
