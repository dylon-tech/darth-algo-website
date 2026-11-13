import {authenticateNativeCallback,type NativeClaims} from './founder-native-policy';
export type FounderRendererIdentity=NativeClaims&{runId:string;attempt:string;reservationStatus:string};
export const authenticateFounderRenderer=authenticateNativeCallback;
