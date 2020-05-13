/**
 * @jest-environment jsdom
 */

/**
 * External Dependencies
 */
import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

/**
 * Internal Dependencies
 */
import Experiment, { Variation, DefaultVariation } from '../index';
import { LoadingVariations } from 'components/experiment';

function renderWithStore( element, initialState ) {
	const actions = [];
	const reducer = ( state, action ) => {
		actions.push( action );
		return state;
	};
	const store = createStore( reducer, initialState );
	return {
		...render( <Provider store={ store }>{ element }</Provider> ),
		actions,
	};
}

function createState( variation, isLoading ) {
	return {
		experiments: {
			variations: { test: variation },
			isLoading: isLoading,
			anonId: '',
			nextRefresh: Date.now,
		},
	};
}

describe( 'Experiment Component', () => {
	const testComponent = ( state, event = false ) =>
		renderWithStore(
			<Experiment name={ 'test' } event={ event ? 'event' : undefined }>
				<DefaultVariation name={ 'a' }>Default</DefaultVariation>
				<Variation name={ 'b' }>Variation B</Variation>
				<LoadingVariations>Is Loading</LoadingVariations>
			</Experiment>,
			state
		);

	test( 'renders a default variation if variation is not set and not loading', () => {
		const { container, actions } = testComponent( createState( undefined, false ) );
		expect( container ).toMatchSnapshot();
		expect( actions ).toHaveLength( 1 );
	} );

	test( 'renders a default variation if loaded', () => {
		const { container, actions } = testComponent( createState( null, false ) );
		expect( container ).toMatchSnapshot();
		expect( actions ).toHaveLength( 1 );
	} );

	test( 'renders a variation by name if loaded', () => {
		const { container, actions } = testComponent( createState( 'b', false ) );
		expect( container ).toMatchSnapshot();
		expect( actions ).toHaveLength( 1 );
	} );

	test( 'renders something while loading if the variation is not defined', () => {
		const { container, actions } = testComponent( createState( undefined, true ) );
		expect( container ).toMatchSnapshot();
		expect( actions ).toHaveLength( 1 );
	} );

	test( 'assumes variation will not change if already set and reloading variations', () => {
		const { container, actions } = testComponent( createState( 'b', true ) );
		expect( container ).toMatchSnapshot();
		expect( actions ).toHaveLength( 1 );
	} );

	test( 'does not fire exposure event when loading', () => {
		const { container, actions } = testComponent( createState( undefined, true ), true );
		expect( container ).toMatchSnapshot();
		expect( actions ).toHaveLength( 1 );
	} );

	test( 'fires exposure event after loading', () => {
		const { container, actions } = testComponent( createState( 'b', false ), true );
		expect( container ).toMatchSnapshot();
		expect( actions ).toHaveLength( 2 );
	} );

	test( 'fires exposure event for default variation', () => {
		const { container, actions } = testComponent( createState( null, false ), true );
		expect( container ).toMatchSnapshot();
		expect( actions ).toHaveLength( 2 );
	} );

	test( 'fires exposure event if we receive no variation', () => {
		const { container, actions } = testComponent( createState( undefined, false ), true );
		expect( container ).toMatchSnapshot();
		expect( actions ).toHaveLength( 2 );
	} );
} );
