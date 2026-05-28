import { Amplify } from 'aws-amplify';

const IDENTITY_POOL_ID = import.meta.env.VITE_AWS_COGNITO_IDENTITY_POOL_ID || 'us-east-1:93d5a993-ce60-4eb7-82d7-daee331ea66f'; 

export const initializeAmplify = () => {
  Amplify.configure({
    Auth: {
      Cognito: {
        identityPoolId: IDENTITY_POOL_ID,
        allowGuestAccess: true,
      },
    },
  });
};

export default initializeAmplify;
