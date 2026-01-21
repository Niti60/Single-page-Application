/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams: { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/../frontend/app/+not-found`; params?: Router.UnknownInputParams; } | { pathname: `/../frontend/app/index`; params?: Router.UnknownInputParams; } | { pathname: `/../frontend/hooks/useFrameworkReady`; params?: Router.UnknownInputParams; } | { pathname: `/../frontend/config/api`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | { pathname: `/+not-found`, params: Router.UnknownInputParams & {  } };
      hrefOutputParams: { pathname: Router.RelativePathString, params?: Router.UnknownOutputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownOutputParams } | { pathname: `/../frontend/app/+not-found`; params?: Router.UnknownOutputParams; } | { pathname: `/../frontend/app/index`; params?: Router.UnknownOutputParams; } | { pathname: `/../frontend/hooks/useFrameworkReady`; params?: Router.UnknownOutputParams; } | { pathname: `/../frontend/config/api`; params?: Router.UnknownOutputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams; } | { pathname: `/+not-found`, params: Router.UnknownOutputParams & {  } };
      href: Router.RelativePathString | Router.ExternalPathString | `/../frontend/app/+not-found${`?${string}` | `#${string}` | ''}` | `/../frontend/app/index${`?${string}` | `#${string}` | ''}` | `/../frontend/hooks/useFrameworkReady${`?${string}` | `#${string}` | ''}` | `/../frontend/config/api${`?${string}` | `#${string}` | ''}` | `/_sitemap${`?${string}` | `#${string}` | ''}` | { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/../frontend/app/+not-found`; params?: Router.UnknownInputParams; } | { pathname: `/../frontend/app/index`; params?: Router.UnknownInputParams; } | { pathname: `/../frontend/hooks/useFrameworkReady`; params?: Router.UnknownInputParams; } | { pathname: `/../frontend/config/api`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | `/+not-found${`?${string}` | `#${string}` | ''}` | { pathname: `/+not-found`, params: Router.UnknownInputParams & {  } };
    }
  }
}
