/**
 * External Dependencies
 */
import React, { FunctionComponent, useEffect } from 'react';
import { connect } from 'react-redux';
import { AppState } from 'types';

/**
 * Internal Dependencies
 */
import { getVariationForUser, isLoading } from 'state/experiments/selectors';
import QueryExperiments from 'components/data/query-experiments';
import { ConnectedExperimentProps, ExperimentProps } from './experiment-props';
import { recordTracksEvent } from 'state/analytics/actions';

export { default as Variation } from './variation';
export { default as DefaultVariation } from './default-variation';
export { default as LoadingVariations } from './loading-variations';

/**
 * The experiment component to display the experiment variations
 *
 * @param props The properties that describe the experiment
 */
export const Experiment: FunctionComponent< ConnectedExperimentProps > = ( props ) => {
	const { isLoading: loading, variation, children, trackExposureEventAction } = props;

	// only fire exposure event once we load and have a variation
	useEffect( () => {
		if ( ! loading && trackExposureEventAction !== null ) {
			trackExposureEventAction();
		}
	}, [ variation, loading, trackExposureEventAction ] );

	return (
		<>
			<QueryExperiments />
			{ React.Children.map( children, ( elem ) => {
				return React.cloneElement( elem, { variation, isLoading: loading } );
			} ) }
		</>
	);
};

function mapStateToProps( state: AppState, ownProps?: ExperimentProps ): ExperimentProps {
	if ( ownProps == null || ownProps.name == null ) {
		if ( ! process.env.NODE_ENV || process.env.NODE_ENV === 'development' ) {
			throw 'Experiment name is not defined!';
		}
		return {
			name: '__unknown_experiment__',
			children: null,
			isLoading: false,
		};
	}
	const { name: experimentName } = ownProps;
	return {
		isLoading: isLoading( state ),
		variation: getVariationForUser( state, experimentName ),
		...ownProps,
	};
}

const trackExposure = (
	eventName: string | undefined | null,
	variation: string | undefined | null
) => {
	if ( eventName ) {
		return recordTracksEvent( eventName, {
			variation,
		} );
	}

	throw new Error( 'Tried to fire exposure event with no event defined!' );
};

const mapDispatchToProps = {
	trackExposure,
};

const mergeProps = (
	stateProps: ExperimentProps,
	dispatchProps: {
		trackExposure: typeof trackExposure;
	},
	ownProps: ExperimentProps
) => {
	const { event } = ownProps;
	const { variation } = stateProps;

	return {
		...ownProps,
		...stateProps,
		trackExposureEventAction: event ? () => dispatchProps.trackExposure( event, variation ) : null,
	};
};

export default connect( mapStateToProps, mapDispatchToProps, mergeProps )( Experiment );
