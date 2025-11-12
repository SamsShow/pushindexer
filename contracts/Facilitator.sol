// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IERC20.sol";
import "./interfaces/IFacilitator.sol";

/**
 * @title Facilitator
 * @dev Facilitator contract for token transfers and cross-chain operations on Push Chain
 */
contract Facilitator is IFacilitator {
    address public owner;
    uint256 public totalFacilitated;
    mapping(address => uint256) public facilitatedByAddress;

    // Transaction types
    uint8 public constant TX_TYPE_NATIVE = 0;
    uint8 public constant TX_TYPE_ERC20 = 1;
    uint8 public constant TX_TYPE_CROSS_CHAIN = 2;

    modifier onlyOwner() {
        require(msg.sender == owner, "Facilitator: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Facilitate a native token (ETH) transfer
     * @param recipient The recipient address
     * @param amount The amount to transfer
     */
    function facilitateNativeTransfer(address recipient, uint256 amount) external payable override {
        require(recipient != address(0), "Facilitator: invalid recipient");
        require(amount > 0, "Facilitator: amount must be greater than 0");
        require(msg.value >= amount, "Facilitator: insufficient value");

        // Transfer native tokens
        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Facilitator: transfer failed");

        // Emit event (txHash will be set by indexer from actual transaction hash)
        emit FacilitatedTx(
            msg.sender,
            recipient,
            address(0), // Native token
            amount,
            bytes32(0), // Placeholder - actual txHash set by indexer
            block.timestamp,
            TX_TYPE_NATIVE
        );

        // Update statistics
        totalFacilitated += amount;
        facilitatedByAddress[msg.sender] += amount;
    }

    /**
     * @dev Facilitate an ERC20 token transfer
     * @param token The token contract address
     * @param recipient The recipient address
     * @param amount The amount to transfer
     */
    function facilitateTokenTransfer(
        address token,
        address recipient,
        uint256 amount
    ) external override {
        require(token != address(0), "Facilitator: invalid token address");
        require(recipient != address(0), "Facilitator: invalid recipient");
        require(amount > 0, "Facilitator: amount must be greater than 0");

        IERC20 tokenContract = IERC20(token);
        
        // Transfer tokens from sender to recipient
        require(
            tokenContract.transferFrom(msg.sender, recipient, amount),
            "Facilitator: token transfer failed"
        );

        // Emit event (txHash will be set by indexer from actual transaction hash)
        emit FacilitatedTx(
            msg.sender,
            recipient,
            token,
            amount,
            bytes32(0), // Placeholder - actual txHash set by indexer
            block.timestamp,
            TX_TYPE_ERC20
        );

        // Update statistics
        totalFacilitated += amount;
        facilitatedByAddress[msg.sender] += amount;
    }

    /**
     * @dev Facilitate a cross-chain operation
     * @param target The target contract address
     * @param value The value to send
     * @param data The call data
     */
    function facilitateCrossChain(
        address target,
        uint256 value,
        bytes calldata data
    ) external payable override {
        require(target != address(0), "Facilitator: invalid target address");
        require(msg.value >= value, "Facilitator: insufficient value");

        // Execute cross-chain call
        (bool success, ) = target.call{value: value}(data);
        require(success, "Facilitator: cross-chain call failed");

        // Emit event (txHash will be set by indexer from actual transaction hash)
        emit FacilitatedTx(
            msg.sender,
            target,
            address(0), // Cross-chain operations don't use a specific token
            value,
            bytes32(0), // Placeholder - actual txHash set by indexer
            block.timestamp,
            TX_TYPE_CROSS_CHAIN
        );

        // Update statistics
        totalFacilitated += value;
        facilitatedByAddress[msg.sender] += value;
    }

    /**
     * @dev Withdraw native tokens (owner only)
     * @param recipient The recipient address
     * @param amount The amount to withdraw
     */
    function withdraw(address recipient, uint256 amount) external onlyOwner {
        require(recipient != address(0), "Facilitator: invalid recipient");
        require(address(this).balance >= amount, "Facilitator: insufficient balance");

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "Facilitator: withdrawal failed");
    }

    /**
     * @dev Transfer ownership (owner only)
     * @param newOwner The new owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Facilitator: invalid new owner");
        owner = newOwner;
    }

    /**
     * @dev Receive function to accept native tokens
     */
    receive() external payable {}
}

