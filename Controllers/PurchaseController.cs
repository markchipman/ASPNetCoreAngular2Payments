﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ASPNetCoreAngular2Payments.Models;
using Braintree;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Stripe;

// For more information on enabling MVC for empty projects, visit http://go.microsoft.com/fwlink/?LinkID=397860

namespace ASPNetCoreAngular2Payments.Controllers
{
    public class PurchaseController : Controller
    {
        private readonly AppSettings _appSettings;

        public PurchaseController(IOptions<AppSettings> settings)
        {
            _appSettings = settings.Value;
        }

        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<JsonResult> StripeCharge([FromBody]StripeChargeModel model)
        {
            if (!ModelState.IsValid)
            {
                return Json(BadRequest());
            }

            var chargeId = await ProcessPayment(model);
            // TODO: You should do something with the chargeId --> Persist it maybe?

            return Json(Ok(chargeId));
        }

        private async Task<string> ProcessPayment(StripeChargeModel model)
        {
            return await Task.Run(() =>
            {
                var myCharge = new StripeChargeCreateOptions
                {
                    Amount = (int)(model.Amount * 100),
                    Currency = model.Currency,
                    Description = model.Description,
                    SourceTokenOrExistingSourceId = model.Token,
                    ReceiptEmail = model.Email,
                    Capture = true,
                };

                var chargeService = new StripeChargeService(_appSettings.StripePrivateKey);
                var stripeCharge = chargeService.Create(myCharge);

                return stripeCharge.Id;
            });
        }

        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<JsonResult> BraintreeCharge([FromBody] string paymentMethodNonce)
        {
            var gateway = new BraintreeGateway
            {
                Environment = Braintree.Environment.SANDBOX,
                MerchantId = _appSettings.BraintreeMerchantId,
                PublicKey = _appSettings.BraintreePublicKey,
                PrivateKey = _appSettings.BraintreePrivateKey
            };

            var request = new TransactionRequest
            {
                Amount = 5.00M,
                PaymentMethodNonce = paymentMethodNonce,
                Options = new TransactionOptionsRequest
                {
                    SubmitForSettlement = true
                }
            };

            var result = await gateway.Transaction.SaleAsync(request);
            if (result.IsSuccess())
            {
                var transaction = result.Target;
                return Json(Ok($"Success!: {transaction.Id}"));
            }
            if (result.Transaction != null)
            {
                var transaction = result.Transaction;
                Console.WriteLine("Error processing transaction:");
                Console.WriteLine("  Status: " + transaction.Status);
                Console.WriteLine("  Code: " + transaction.ProcessorResponseCode);
                Console.WriteLine("  Text: " + transaction.ProcessorResponseText);
            }
            else
            {
                foreach (var error in result.Errors.DeepAll())
                {
                    Console.WriteLine("Attribute: " + error.Attribute);
                    Console.WriteLine("  Code: " + error.Code);
                    Console.WriteLine("  Message: " + error.Message);
                }
            }

            return Json(BadRequest());
        }
    }
}
