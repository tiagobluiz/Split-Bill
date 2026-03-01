import { profileApi } from "./contractsClient";

export type ProfilePreferencesInput = {
  preferredCurrency: string;
};

export async function updatePreferences(input: ProfilePreferencesInput) {
  return profileApi.mePreferencesPatch({
    updatePreferencesRequest: {
      preferredCurrency: input.preferredCurrency
    }
  });
}
