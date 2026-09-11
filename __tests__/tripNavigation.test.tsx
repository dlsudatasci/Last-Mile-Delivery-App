import React from 'react';
import { Alert, BackHandler } from 'react-native';
import { router } from 'expo-router';
import { useTripReviews } from '../lib/store/useTripReviews';
import { submitTripReview } from '../lib/firebase-crud/reviews';
import TabLayout from '../app/main/(tabs)/_layout';
import PostTripQuestionnaire from '../app/main/(tabs)/record/post-trip-questionnaire';

const { create, act } = require('react-test-renderer');
let mockPrevented = false;
let mockRemove: () => void;
let mockHardwareBack: () => boolean;
let mockSegments = ['main', '(tabs)', 'record', 'index'];
let mockParams = { rideId: 'ride-1', deviationCount: '0' };
const mockRide = { isRecording: true, isPaused: true, activeRouteDestination: [121, 14], points: [1, 2], resetRide: jest.fn() };
jest.mock('../lib/store/useRideStore', () => ({ useRideStore: { getState: () => mockRide } }));
jest.mock('../lib/firebase-crud/reviews', () => ({ submitTripReview: jest.fn() }));
jest.mock('../lib/utils/responsive-sizing', () => ({ fontSizes: {}, sizes: {} }));
jest.mock('../components/common/HeaderBackButton', () => 'HeaderBackButton');
jest.mock('expo-router', () => ({
    router: { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn() },
    Tabs: Object.assign((props: any) => require('react').createElement('Tabs', props), { Screen: 'TabScreen' }),
    Stack: { Screen: 'StackScreen' },
    useSegments: () => mockSegments,
    useGlobalSearchParams: () => mockParams,
    useLocalSearchParams: () => mockParams,
}));
jest.mock('@react-navigation/native', () => ({
    getFocusedRouteNameFromRoute: () => 'index',
    usePreventRemove: (prevented: boolean, callback: () => void) => { mockPrevented = prevented; mockRemove = callback; },
    useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}));
jest.mock('react-native-paper', () => ({
    Button: 'Button', SegmentedButtons: 'SegmentedButtons', Surface: 'Surface', Text: 'Text',
    ActivityIndicator: 'ActivityIndicator', Icon: 'Icon', IconButton: 'IconButton',
    useTheme: () => ({ colors: {} }),
}));
let tree: any;
beforeEach(() => {
    jest.clearAllMocks();
    useTripReviews.setState({ reviews: {} });
    mockRide.isRecording = true;
    mockSegments = ['main', '(tabs)', 'record', 'index'];
    mockParams = { rideId: 'ride-1', deviationCount: '0' };
    mockRide.resetRide.mockImplementation(async () => { mockRide.isRecording = false; });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_name, callback) => {
        mockHardwareBack = callback as () => boolean;
        return { remove: jest.fn() };
    });
});
afterEach(() => { if (tree) act(() => tree.unmount()); });
function pressTab(name: string) {
    const screen = tree.root.findAllByType('TabScreen').find((s: any) => s.props.name === name);
    if (name === 'record') screen.props.options.tabBarButton().props.onPress();
    else {
        const event = { preventDefault: jest.fn() };
        screen.props.listeners.tabPress(event);
        return event;
    }
}
function lastAlert() { return (Alert.alert as jest.Mock).mock.calls.slice(-1)[0]; }
test.each(['home', 'community', 'map', 'profile', 'record'])('%s preserves active trip on continue/dismiss and waits for cancellation', async name => {
    act(() => { tree = create(<TabLayout />); });
    const destination = mockRide.activeRouteDestination;
    act(() => pressTab(name));
    expect(lastAlert()[0]).toBe('Trip in Progress');
    expect(mockRide.resetRide).not.toHaveBeenCalled();
    act(() => lastAlert()[2][0].onPress());
    expect(mockRide.isRecording).toBe(true);
    expect(mockRide.activeRouteDestination).toBe(destination);
    expect(mockRide.points).toEqual([1, 2]);
    expect(mockRide.isPaused).toBe(true);
    act(() => pressTab(name));
    act(() => lastAlert()[3].onDismiss());
    expect(mockRide.resetRide).not.toHaveBeenCalled();
    let finish!: () => void;
    mockRide.resetRide.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
    act(() => pressTab(name));
    let pending: Promise<void>;
    act(() => { pending = lastAlert()[2][1].onPress(); });
    act(() => pressTab(name));
    expect(router.push).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    await act(async () => { mockRide.isRecording = false; finish(); await pending; });
    expect(mockRide.resetRide).toHaveBeenCalledTimes(1);
    if (name === 'record') expect(router.push).toHaveBeenCalledWith('/main/(tabs)/record/destination');
    else expect(router.navigate).toHaveBeenCalledWith(`/main/(tabs)/${name}`);
});
test('inactive Record opens destination without cancellation', () => {
    mockRide.isRecording = false;
    act(() => { tree = create(<TabLayout />); });
    act(() => pressTab('record'));
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith('/main/(tabs)/record/destination');
});
function button(label: string | number) {
    return tree.root.findAllByType('Button').find((b: any) => b.props.children === label);
}
function fillAnswers() {
    act(() => button('Early').props.onPress());
    const ratings = tree.root.findAllByType('Button').filter((b: any) => b.props.children === 3);
    act(() => { ratings[0].props.onPress(); ratings[1].props.onPress(); });
}
test('header, form, system and removal back preserve answers; failure retries; success unlocks once', async () => {
    act(() => { tree = create(<PostTripQuestionnaire />); });
    fillAnswers();
    act(() => button('Back').props.onPress());
    act(() => tree.root.findByType('StackScreen').props.options.headerLeft().props.onPress());
    act(() => { expect(mockHardwareBack()).toBe(true); mockRemove(); });
    expect(mockPrevented).toBe(true);
    expect(button('Early').props.mode).toBe('contained');
    expect(router.replace).not.toHaveBeenCalled();
    (submitTripReview as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    await act(async () => button('Finish').props.onPress());
    expect(useTripReviews.getState().reviews['ride-1'].status).toBe('pending');
    expect(mockPrevented).toBe(true);
    expect(button('Early').props.mode).toBe('contained');
    let resolve!: () => void;
    (submitTripReview as jest.Mock).mockImplementationOnce(() => new Promise<void>(r => { resolve = r; }));
    const finish = button('Finish').props.onPress;
    let pending: Promise<void>;
    act(() => { pending = finish(); finish(); });
    expect(submitTripReview).toHaveBeenCalledTimes(2);
    await act(async () => { resolve(); await pending; });
    expect(mockPrevented).toBe(false);
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith('/main/(tabs)/map');
    expect(mockRide.resetRide).not.toHaveBeenCalled();
});
test('deviation continuation keeps the root required and does not submit prematurely', async () => {
    mockParams.deviationCount = '2';
    act(() => { tree = create(<PostTripQuestionnaire />); });
    fillAnswers();
    await act(async () => button('Next').props.onPress());
    expect(router.push).toHaveBeenCalledWith(expect.objectContaining({ pathname: '/main/(tabs)/record/change-routes' }));
    expect(submitTripReview).not.toHaveBeenCalled();
    expect(mockPrevented).toBe(true);
});
test('tabs cannot bypass a pending review, but work after successful submission', () => {
    mockRide.isRecording = false;
    mockSegments = ['main', '(tabs)', 'record', 'post-trip-questionnaire'];
    act(() => { tree = create(<TabLayout />); });
    for (const name of ['home', 'community', 'map', 'profile', 'record']) act(() => pressTab(name));
    expect(router.navigate).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    act(() => useTripReviews.getState().markReviewed('ride-1'));
    act(() => { expect(pressTab('home')?.preventDefault).not.toHaveBeenCalled(); });
});


test('failed cancellation does not navigate and permits another attempt', async () => {
    mockRide.resetRide.mockRejectedValueOnce(new Error('storage failure'));
    act(() => { tree = create(<TabLayout />); });
    act(() => pressTab('record'));
    await act(async () => lastAlert()[2][1].onPress());
    expect(router.push).not.toHaveBeenCalled();
    expect(mockRide.isRecording).toBe(true);
    act(() => pressTab('record'));
    expect(lastAlert()[0]).toBe('Trip in Progress');
});
test('reviewed questionnaire allows ordinary Back without a new submission', () => {
    useTripReviews.getState().markReviewed('ride-1');
    act(() => { tree = create(<PostTripQuestionnaire />); });
    expect(mockPrevented).toBe(false);
    expect(tree.root.findByType('StackScreen').props.options.gestureEnabled).toBe(true);
    act(() => button('Back').props.onPress());
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(submitTripReview).not.toHaveBeenCalled();
});
