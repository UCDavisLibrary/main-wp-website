import fetch from "node-fetch";

import Config from "./config.js";
import cache from '../lib/http-cache.js';

class WpApi {
  constructor(config) {
    if ( config ) {
      this.config = config;
    } else {
      this.config = new Config();
    }
  }

  /**
   * @method getTypeName
   * @description  make plural, api creaat endpoint hits the list endpoint with a POST
   *
   * @param {String} type
   * @returns
   */
  getTypeName(type) {
    if( type === 'media' ) return type;
    if( type === 'exhibit' ) return type;
    if( type === 'exhibits' ) return 'exhibit';
    if( type === 'library' ) return type;
    if( type === 'libraries' ) return 'library';
    if( type === 'expertise' ) return type;
    if( type === 'department' ) return type;
    if( type === 'departments' ) return 'department';
    if( type === 'person' ) return type;
    if( type === 'directory-tag' ) return type;
    if( type === 'directory-tags' ) return 'directory-tag';
    if( type === 'exhibit-location' ) return type;
    if( type === 'exhibit-locations' ) return 'exhibit-location';
    if( type === 'curator' ) return type;
    if( type === 'curators' ) return 'curator';

    if( !type.match(/s$/) ) {
      if( type.match(/y$/) ) type = type.replace(/y$/, 'ies');
      else type = type+'s';
    }
    return type;
  }

  async getPostsByType(postType, params = {}) {
    postType = this.getTypeName(postType);
    const queryParams = this.toSearchParamsObject(params.query);

    let host = this.config.host;
    if ( params.host ) {
      host = params.host;
    }

    let apiPath = this.config.apiPath;
    if ( params.apiPath ) {
      apiPath = params.apiPath;
    }

    let useCache = this.config.useCache;
    if ( params.hasOwnProperty('useCache') ) {
      useCache = params.useCache;
    }

    let writeToCache = this.config.writeToCache;
    if ( params.hasOwnProperty('writeToCache') ) {
      writeToCache = params.writeToCache;
    }

    const q = queryParams.toString();
    let url = `${host}${apiPath}/${postType}${q ? '?' + q : ''}`;
    console.log(`Fetching ${url}`);

    if ( useCache ){
      const cached = cache.get(url);
      if ( cached ) {
        return cached;
      }
    }

    const response = await fetch(url);
    if ( !response.ok ) {
      throw new Error(`HTTP error retrieving ${url}! status: ${response.status}`);
    }

    const json = await response.json();
    if ( writeToCache ) {
      cache.set(url, json);
    }

    return json;

  }

  async getPostsByTypeAll(postType, params = {}) {
    const out = [];
    let page = 1;
    const queryParams = this.toSearchParamsObject(params.query);
    queryParams.set('per_page', 100);
    while ( true ) {
      queryParams.set('page', page);
      const p = {...params, query: queryParams}
      const list = await this.getPostsByType(postType, p);
      out.push(...list);
      if ( list.length < 100 ) {
        break;
      }
      page++;
    }
  }

  toSearchParamsObject(params) {
    params = new URLSearchParams(params);
    params.sort();
    return params;
  }
}

export default WpApi;
