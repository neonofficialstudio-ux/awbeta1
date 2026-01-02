import { getRepository } from '../api/database/repository.factory';
import type { Action } from './actions';

type Dispatch = (action: Action) => void;

type EventSettingsPayload = Extract<Action, { type: 'REFRESH_EVENT_SETTINGS' }>['payload'];

export const refreshEventSettings = async (dispatch: Dispatch): Promise<void> => {
  const repository = getRepository();

  try {
    let settings: EventSettingsPayload = {};

    if (repository.selectAsync) {
      const data = await repository.selectAsync('event_settings');
      settings = Array.isArray(data) ? (data[0] as EventSettingsPayload) ?? {} : (data as EventSettingsPayload) ?? {};
    }

    if ((!settings || Object.keys(settings).length === 0) && repository.rpc) {
      const rpcResult = await repository.rpc('get_event_settings');
      settings = Array.isArray(rpcResult) ? (rpcResult[0] as EventSettingsPayload) ?? {} : (rpcResult as EventSettingsPayload) ?? {};
    }

    dispatch({ type: 'REFRESH_EVENT_SETTINGS', payload: settings || {} });
  } catch (error) {
    console.error('[EventSettings] Failed to refresh event settings', error);
    dispatch({ type: 'REFRESH_EVENT_SETTINGS', payload: {} });
  }
};
