import {currentForecastMonth} from './forecast-data';
export type PaymentVerification={verification_status?:'pending_review'|'reviewed';verification_month?:string};
/** A review is limited to its explicit month; it never certifies a payment. */
export function paymentReviewedForMonth(value:PaymentVerification,month=currentForecastMonth()){
 return value.verification_status==='reviewed'&&value.verification_month===month;
}
export function paymentReviewLabel(value:PaymentVerification,month=currentForecastMonth()){
 return paymentReviewedForMonth(value,month)?'Revisado · sin saldo registrado':'Pago por verificar';
}
