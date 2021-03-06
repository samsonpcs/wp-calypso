/**
 * External dependencies
 */
import React, { useEffect, useState } from 'react';
import { useTranslate } from 'i18n-calypso';
import styled from '@emotion/styled';
import {
	Checkout,
	CheckoutStep,
	CheckoutStepArea,
	CheckoutSteps,
	CheckoutSummaryArea,
	getDefaultPaymentMethodStep,
	useIsStepActive,
	useIsStepComplete,
	useSelect,
	useLineItems,
	useDispatch,
	useTotal,
	usePaymentMethod,
	renderDisplayValueMarkdown,
} from '@automattic/composite-checkout';

/**
 * Internal dependencies
 */
import { areDomainsInLineItems, isLineItemADomain } from '../hooks/has-domains';
import useCouponFieldState from '../hooks/use-coupon-field-state';
import WPCheckoutOrderReview from './wp-checkout-order-review';
import WPCheckoutOrderSummary from './wp-checkout-order-summary';
import WPContactForm from './wp-contact-form';
import { isCompleteAndValid } from '../types';
import { WPOrderReviewTotal, WPOrderReviewSection, LineItemUI } from './wp-order-review-line-items';
import CartFreeUserPlanUpsell from 'my-sites/checkout/cart/cart-free-user-plan-upsell';
import MaterialIcon from 'components/material-icon';
import Gridicon from 'components/gridicon';

const ContactFormTitle = () => {
	const translate = useTranslate();
	const isActive = useIsStepActive();
	const isComplete = useIsStepComplete();
	const [ items ] = useLineItems();

	if ( areDomainsInLineItems( items ) ) {
		return ! isActive && isComplete
			? translate( 'Contact information' )
			: translate( 'Enter your contact information' );
	}
	return ! isActive && isComplete
		? translate( 'Billing information' )
		: translate( 'Enter your billing information' );
};

const OrderReviewTitle = () => {
	const translate = useTranslate();
	return translate( 'Review your order' );
};

const paymentMethodStep = getDefaultPaymentMethodStep();

export default function WPCheckout( {
	removeItem,
	updateLocation,
	submitCoupon,
	removeCoupon,
	couponStatus,
	changePlanLength,
	siteId,
	siteUrl,
	CountrySelectMenu,
	CheckoutTerms,
	countriesList,
	StateSelect,
	renderDomainContactFields,
	variantRequestStatus,
	variantSelectOverride,
	getItemVariants,
	domainContactValidationCallback,
	responseCart,
	addItemToCart,
	subtotal,
	isCartPendingUpdate,
} ) {
	const translate = useTranslate();
	const couponFieldStateProps = useCouponFieldState( submitCoupon );
	const total = useTotal();
	const activePaymentMethod = usePaymentMethod();

	const [ items ] = useLineItems();
	const firstDomainItem = items.find( isLineItemADomain );
	const domainName = firstDomainItem ? firstDomainItem.wpcom_meta.meta : siteUrl;
	const isDomainFieldsVisible = !! firstDomainItem;
	const shouldShowContactStep = isDomainFieldsVisible || total.amount.value > 0;

	const contactInfo = useSelect( ( sel ) => sel( 'wpcom' ).getContactInfo() ) || {};
	const { setSiteId, touchContactFields, applyDomainContactValidationResults } = useDispatch(
		'wpcom'
	);

	const [
		shouldShowContactDetailsValidationErrors,
		setShouldShowContactDetailsValidationErrors,
	] = useState( false );

	const contactValidationCallback = async () => {
		updateLocation( {
			countryCode: contactInfo.countryCode.value,
			postalCode: contactInfo.postalCode.value,
			subdivisionCode: contactInfo.state.value,
		} );
		// Touch the fields so they display validation errors
		touchContactFields();

		if ( isDomainFieldsVisible ) {
			const hasValidationErrors = await domainContactValidationCallback(
				activePaymentMethod.id,
				contactInfo,
				[ domainName ],
				applyDomainContactValidationResults
			);
			return ! hasValidationErrors;
		}

		return isCompleteAndValid( contactInfo );
	};

	const [ isSummaryVisible, setIsSummaryVisible ] = useState( false );

	// Copy siteId to the store so it can be more easily accessed during payment submission
	useEffect( () => {
		setSiteId( siteId );
	}, [ siteId, setSiteId ] );

	const removeCouponAndResetActiveStep = () => {
		removeCoupon();
		// Since the first step may now be invalid (eg: newly empty CC fields) we need to go back.
		setActiveStepNumber( 1 );
	};

	// By this point we have definitely loaded the cart using useShoppingCart
	// so we mock the loaded property the CartStore would inject.
	const mockCart = { ...responseCart, hasLoadedFromServer: true };

	return (
		<Checkout>
			<CheckoutSummaryArea className={ isSummaryVisible ? 'is-visible' : '' }>
				<CheckoutSummaryTitleLink onClick={ () => setIsSummaryVisible( ! isSummaryVisible ) }>
					<CheckoutSummaryTitle>
						<CheckoutSummaryTitleIcon icon="info-outline" size={ 20 } />
						{ translate( 'Purchase Details' ) }
						<CheckoutSummaryTitleToggle icon="keyboard_arrow_down" />
					</CheckoutSummaryTitle>
					<CheckoutSummaryTitlePrice>
						{ renderDisplayValueMarkdown( total.amount.displayValue ) }
					</CheckoutSummaryTitlePrice>
				</CheckoutSummaryTitleLink>
				<CheckoutSummaryBody>
					<WPCheckoutOrderSummary />
					<UpsellWrapperUI>
						<CartFreeUserPlanUpsell cart={ mockCart } addItemToCart={ addItemToCart } />
					</UpsellWrapperUI>
				</CheckoutSummaryBody>
			</CheckoutSummaryArea>
			<CheckoutStepArea>
				<CheckoutSteps>
					<CheckoutStep
						stepId="review-order-step"
						isCompleteCallback={ () => true }
						activeStepContent={
							<WPCheckoutOrderReview
								removeItem={ removeItem }
								couponStatus={ couponStatus }
								couponFieldStateProps={ couponFieldStateProps }
								removeCoupon={ removeCouponAndResetActiveStep }
								onChangePlanLength={ changePlanLength }
								variantRequestStatus={ variantRequestStatus }
								variantSelectOverride={ variantSelectOverride }
								getItemVariants={ getItemVariants }
								siteUrl={ siteUrl }
							/>
						}
						titleContent={ <OrderReviewTitle /> }
						completeStepContent={ <InactiveOrderReview /> }
						editButtonText={ translate( 'Edit' ) }
						editButtonAriaLabel={ translate( 'Edit the payment method' ) }
						nextStepButtonText={ translate( 'Continue' ) }
						nextStepButtonAriaLabel={ translate( 'Continue with the selected payment method' ) }
						validatingButtonText={
							isCartPendingUpdate ? translate( 'Updating cart…' ) : translate( 'Please wait…' )
						}
						validatingButtonAriaLabel={
							isCartPendingUpdate ? translate( 'Updating cart…' ) : translate( 'Please wait…' )
						}
					/>
					{ shouldShowContactStep && (
						<CheckoutStep
							stepId={ 'contact-form' }
							isCompleteCallback={ () => {
								setShouldShowContactDetailsValidationErrors( true );
								return contactValidationCallback();
							} }
							activeStepContent={
								<WPContactForm
									siteUrl={ siteUrl }
									isComplete={ false }
									isActive={ true }
									CountrySelectMenu={ CountrySelectMenu }
									countriesList={ countriesList }
									StateSelect={ StateSelect }
									renderDomainContactFields={ renderDomainContactFields }
									shouldShowContactDetailsValidationErrors={
										shouldShowContactDetailsValidationErrors
									}
								/>
							}
							completeStepContent={
								<WPContactForm summary isComplete={ true } isActive={ false } />
							}
							titleContent={ <ContactFormTitle /> }
							editButtonText={ translate( 'Edit' ) }
							editButtonAriaLabel={ translate( 'Edit the contact details' ) }
							nextStepButtonText={ translate( 'Continue' ) }
							nextStepButtonAriaLabel={ translate( 'Continue with the entered contact details' ) }
							validatingButtonText={
								isCartPendingUpdate ? translate( 'Updating cart…' ) : translate( 'Please wait…' )
							}
							validatingButtonAriaLabel={
								isCartPendingUpdate ? translate( 'Updating cart…' ) : translate( 'Please wait…' )
							}
						/>
					) }
					<CheckoutStep
						stepId="payment-method-step"
						activeStepContent={
							<PaymentMethodStep
								CheckoutTerms={ CheckoutTerms }
								responseCart={ responseCart }
								subtotal={ subtotal }
							/>
						}
						completeStepContent={ paymentMethodStep.completeStepContent }
						titleContent={ paymentMethodStep.titleContent }
						editButtonText={ translate( 'Edit' ) }
						editButtonAriaLabel={ translate( 'Edit the payment method' ) }
						nextStepButtonText={ translate( 'Continue' ) }
						nextStepButtonAriaLabel={ translate( 'Continue with the selected payment method' ) }
						validatingButtonText={
							isCartPendingUpdate ? translate( 'Updating cart…' ) : translate( 'Please wait…' )
						}
						validatingButtonAriaLabel={
							isCartPendingUpdate ? translate( 'Updating cart…' ) : translate( 'Please wait…' )
						}
					/>
				</CheckoutSteps>
			</CheckoutStepArea>
		</Checkout>
	);
}

const CheckoutSummaryTitleLink = styled.button`
	background: ${( props ) => props.theme.colors.background};
	border-bottom: 1px solid ${( props ) => props.theme.colors.borderColorLight};
	color: ${( props ) => props.theme.colors.textColor};
	display: flex;
	font-size: 16px;
	font-weight: ${( props ) => props.theme.weights.bold};
	justify-content: space-between;
	padding: 20px 23px 20px 14px;
	width: 100%;

	.is-visible & {
		border-bottom: none;
	}

	@media ( ${( props ) => props.theme.breakpoints.smallPhoneUp} ) {
		border: 1px solid ${( props ) => props.theme.colors.borderColorLight};
		border-bottom: none 0;
	}

	@media ( ${( props ) => props.theme.breakpoints.desktopUp} ) {
		display: none;
	}
`;

const CheckoutSummaryTitle = styled.span`
	display: flex;
`;

const CheckoutSummaryTitleIcon = styled( Gridicon )`
	margin-right: 4px;
`;

const CheckoutSummaryTitleToggle = styled( MaterialIcon )`
	fill: ${( props ) => props.theme.colors.textColor};
	margin-left: 4px;
	transition: transform 0.1s linear;
	width: 18px;
	height: 18px;
	vertical-align: bottom;

	.is-visible & {
		transform: rotate( 180deg );
	}
`;

const CheckoutSummaryTitlePrice = styled.span`
	.is-visible & {
		display: none;
	}
`;

const CheckoutSummaryBody = styled.div`
	border-bottom: 1px solid ${( props ) => props.theme.colors.borderColorLight};
	display: none;

	.is-visible & {
		display: block;
	}

	@media ( ${( props ) => props.theme.breakpoints.smallPhoneUp} ) {
		border-bottom: none;
	}

	@media ( ${( props ) => props.theme.breakpoints.desktopUp} ) {
		display: block;
	}
`;

const UpsellWrapperUI = styled.div`
	background: ${( props ) => props.theme.colors.surface};

	@media ( ${( props ) => props.theme.breakpoints.desktopUp} ) {
		margin-top: 24px;
	}

	.cart__upsell-wrapper {
		@media ( ${( props ) => props.theme.breakpoints.smallPhoneUp} ) {
			border-left: 1px solid ${( props ) => props.theme.colors.borderColorLight};
			border-right: 1px solid ${( props ) => props.theme.colors.borderColorLight};
		}

		@media ( ${( props ) => props.theme.breakpoints.desktopUp} ) {
			border: 1px solid ${( props ) => props.theme.colors.borderColorLight};
		}
	}

	.cart__upsell-header {
		border-top: 1px solid ${( props ) => props.theme.colors.borderColorLight};
		box-shadow: none;
		margin-left: 20px;
		margin-right: 20px;
		padding-left: 0;
		padding-right: 0;

		@media ( ${( props ) => props.theme.breakpoints.desktopUp} ) {
			border-top: none;
			border-bottom: 1px solid ${( props ) => props.theme.colors.borderColorLight};
			margin-left: 0;
			margin-right: 0;
			padding-left: 20px;
			padding-right: 20px;
		}

		.section-header__label {
			color: ${( props ) => props.theme.colors.textColor};
			font-size: 16px;
		}
	}

	.cart__upsell-body {
		padding: 0 20px 20px;

		@media ( ${( props ) => props.theme.breakpoints.desktopUp} ) {
			padding: 20px;
		}

		p {
			margin-bottom: 1.2em;
		}
	}
`;

function setActiveStepNumber( stepNumber ) {
	window.location.hash = '#step' + stepNumber;
}

function PaymentMethodStep( { CheckoutTerms, responseCart, subtotal } ) {
	const [ items, total ] = useLineItems();
	const taxes = items.filter( ( item ) => item.type === 'tax' );
	return (
		<>
			{ paymentMethodStep.activeStepContent }

			<CheckoutTermsUI>
				<CheckoutTerms cart={ responseCart } />
			</CheckoutTermsUI>

			<WPOrderReviewSection>
				{ subtotal && <LineItemUI subtotal item={ subtotal } /> }
				{ taxes.map( ( tax ) => (
					<LineItemUI tax key={ tax.id } item={ tax } />
				) ) }
				<WPOrderReviewTotal total={ total } />
			</WPOrderReviewSection>
		</>
	);
}

function InactiveOrderReview() {
	const [ items ] = useLineItems();
	return (
		<SummaryContent>
			<ProductList>
				{ items.filter( shouldItemBeInSummary ).map( ( product ) => {
					return (
						<ProductListItem key={ product.id }>
							{ isLineItemADomain( product ) ? <strong>{ product.label }</strong> : product.label }
						</ProductListItem>
					);
				} ) }
			</ProductList>
		</SummaryContent>
	);
}

function shouldItemBeInSummary( item ) {
	const itemTypesToIgnore = [ 'tax', 'credits', 'wordpress-com-credits' ];
	return ! itemTypesToIgnore.includes( item.type );
}

const CheckoutTermsUI = styled.div`
	& > * {
		margin: 16px 0 16px -24px;
		padding-left: 24px;
		position: relative;
	}

	& div:first-of-type {
		padding-left: 0;
		margin-left: 0;
		margin-top: 32px;
	}

	svg {
		width: 16px;
		height: 16px;
		position: absolute;
		top: 0;
		left: 0;
	}

	p {
		font-size: 12px;
		margin: 0;
		word-break: break-word;
	}

	a {
		text-decoration: underline;
	}

	a:hover {
		text-decoration: none;
	}
`;

const SummaryContent = styled.div`
	margin-top: 12px;

	@media ( ${( props ) => props.theme.breakpoints.smallPhoneUp} ) {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
	}
`;

const ProductList = styled.ul`
	margin: 0;
	padding: 0;
`;

const ProductListItem = styled.li`
	color: ${( props ) => props.theme.colors.textColor};
	font-size: 14px;
	margin: 0 0 6px;
	padding: 0;
	list-style-type: none;

	&:last-of-type {
		margin-bottom: 0;
	}
`;
