/**
 * Copyright Camunda Services GmbH and/or licensed to Camunda Services GmbH
 * under one or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information regarding copyright
 * ownership.
 *
 * Camunda licenses this file to you under the MIT; you may not use this file
 * except in compliance with the MIT License.
 */

import React from 'react';

import css from './Loader.less';

import classNames from 'classnames';

const LOGO_SRC = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20960%20960%22%3E%3Cpath%20fill%3D%22%23fff%22%20d%3D%22M960%2060v839c0%2033-27%2061-60%2061H60c-33%200-60-27-60-60V60C0%2027%2027%200%2060%200h839c34%200%2061%2027%2061%2060z%22%2F%3E%3Cpath%20fill%3D%22%23DDD%22%20d%3D%22M217%20548a205%20205%200%200%200-144%2058%20202%20202%200%200%200-4%20286%20202%20202%200%200%200%20285%203%20200%20200%200%200%200%2048-219%20203%20203%200%200%200-185-128zM752%206a206%20206%200%200%200-192%20285%20206%20206%200%200%200%20269%20111%20207%20207%200%200%200%20111-260A204%20204%200%200%200%20752%206zM62%200A62%2062%200%200%200%200%2062v398l60%2046a259%20259%200%200%201%2089-36c5-28%2010-57%2014-85l99%202%2012%2085a246%20246%200%200%201%2088%2038l70-52%2069%2071-52%2068c17%2030%2029%2058%2035%2090l86%2014-2%20100-86%2012a240%20240%200%200%201-38%2089l43%2058h413c37%200%2060-27%2060-61V407a220%20220%200%200%201-44%2040l21%2085-93%2039-45-76a258%20258%200%200%201-98%201l-45%2076-94-39%2022-85a298%20298%200%200%201-70-69l-86%2022-38-94%2076-45a258%20258%200%200%201-1-98l-76-45%2040-94%2085%2022a271%20271%200%200%201%2041-47z%22%2F%3E%3C%2Fsvg%3E';


export default function Loader(props) {

  const {
    hidden
  } = props;

  return (
    <div className={ classNames(css.Loader, { hidden }) }>
      <img className="logo" src={ LOGO_SRC } alt="bpmn.io logo" />
    </div>
  );
}