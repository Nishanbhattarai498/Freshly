/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams: { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | { pathname: `/auth/login`; params?: Router.UnknownInputParams; } | { pathname: `/auth/signup`; params?: Router.UnknownInputParams; } | { pathname: `/protected/customer/home`; params?: Router.UnknownInputParams; } | { pathname: `/protected/shopkeeper/dashboard`; params?: Router.UnknownInputParams; };
      hrefOutputParams: { pathname: Router.RelativePathString, params?: Router.UnknownOutputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownOutputParams } | { pathname: `/`; params?: Router.UnknownOutputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams; } | { pathname: `/auth/login`; params?: Router.UnknownOutputParams; } | { pathname: `/auth/signup`; params?: Router.UnknownOutputParams; } | { pathname: `/protected/customer/home`; params?: Router.UnknownOutputParams; } | { pathname: `/protected/shopkeeper/dashboard`; params?: Router.UnknownOutputParams; };
      href: Router.RelativePathString | Router.ExternalPathString | `/${`?${string}` | `#${string}` | ''}` | `/_sitemap${`?${string}` | `#${string}` | ''}` | `/auth/login${`?${string}` | `#${string}` | ''}` | `/auth/signup${`?${string}` | `#${string}` | ''}` | `/protected/customer/home${`?${string}` | `#${string}` | ''}` | `/protected/shopkeeper/dashboard${`?${string}` | `#${string}` | ''}` | { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; } | { pathname: `/auth/login`; params?: Router.UnknownInputParams; } | { pathname: `/auth/signup`; params?: Router.UnknownInputParams; } | { pathname: `/protected/customer/home`; params?: Router.UnknownInputParams; } | { pathname: `/protected/shopkeeper/dashboard`; params?: Router.UnknownInputParams; };
    }
  }
}
