/**
 * External Dependencies
 */
import { ReactNode } from 'react';
import { Action } from 'redux';

/**
 * The expected props for the top-level experiment component
 */
export type ExperimentProps = {
	name: string;
	children: ReactNode;
	variation?: string;
	isLoading?: boolean;
	event?: string;
};

export type ConnectedExperimentProps = {
	name: string;
	children: ReactNode;
	variation?: string;
	isLoading?: boolean;
	trackExposureEventAction: () => Action | null;
};
